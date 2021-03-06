const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const { transport , makeANiceEmail } = require('./../mail');
const { hasPermission } = require("./../utils");
const stripe = require('./../stripe');

const mutations = {
  async createItem(parent, args, ctx, info) {
    // if the user are loggedIn
    if(!ctx.request.userId){
      throw new Error("You must be logged in to do that")
    }
    const item = await ctx.db.mutation.createItem({
      data: {
        // this is how we create a relationship between the ITEM and the USER
        user: {
          connect:{
            id: ctx.request.userId
          },
        },
        ...args
      }
    }, info);

    return item;
  },
  async updateItem(parent, args, ctx, info) {
    // first take copy of updates
    const updates = { ...args };
    // find the item
    const item = await ctx.db.query.item({ where: { id: updates.id } }, `{  id  title user { id } }`);
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPermission = ctx.request.user.permissions.some(
      (permission) => ['ADMIN','ITEMUPDATE'].includes(permission)
    )
    if(!ownsItem || !hasPermission){
      throw new Error("You don't have permission to do that!")
    }
    delete updates.id;
    return ctx.db.mutation.updateItem({
      data: updates,
      where: {
        id: args.id
      }
    },
      info
    )
  },
async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    // find the item
    const item = await ctx.db.query.item({ where }, `{  id  title user { id } }`)
    // 2 check that if they own the item and have permissions
      const ownsItem = item.user.id === ctx.request.userId;
      const hasPermission = ctx.request.user.permissions.some(
        (permission) => ['ADMIN', 'ITEMDELETE'].includes(permission)
      )
      if(!ownsItem || !hasPermission){
        throw new Error("You don't have permission to do that!")
      }
    // Delete It
    return ctx.db.mutation.deleteItem({ where }, info)

  },
  async signup(parent, args, ctx, info) {
    // lowercase their email
    args.email = args.email.toLowerCase();
    // hash their password
    const password = await bcrypt.hash(args.password, 10);
    // create the user in the database
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ['USER'] },
        },
      },
      info
    );
    // create the JWT token for them
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // We set the jwt as a cookie on the response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // Finalllllly we return the user to the browser
    return user;
  },
  async signin(parent, args, ctx, info){
    const { email , password } = args;
    const user = await ctx.db.query.user({  where: { email } });
    if(!user){
     throw new Error(`No such user found for email ${email}`)
    }
    // check if their password is valid
    const valid = await bcrypt.compare(password, user.password);
    if(!valid){
       throw new Error('Invalid Password!');
    }
    // generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // set the cookie with the token
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    })
    // return user
    return user;
  },
  signout(parent, args, ctx, info){
    ctx.response.clearCookie('token');
    return {
      message : "Good Bye!"
    }
  },
 async requestReset(parent, args, ctx, info){
     // check if the user is reqal
     const user = await ctx.db.query.user({where: { email : args.email }});
     if(!user){
      throw new Error(`No such user found for email ${args.email}`)
     }
     // set a reset token and expiry on that user
     const randomBytesPromisefied = promisify(randomBytes)
     const resetToken = ( await randomBytesPromisefied(20)).toString('hex');
     const resetTokenExpiry = Date.now() + 3600000 // 1 hour from now
     const res = await ctx.db.mutation.updateUser({
       where:{ email : args.email },
       data: { resetToken , resetTokenExpiry}
     });
     // 3 Email them that reset token
     const mailRes = await transport.sendMail({
       from:"mughees@siddiqui.com",
       to: user.email,
       subject:"Your Password Reset Token",
       html: makeANiceEmail(`Your Password Reset Token is here!
        \n\n
        <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">
          Click Here to Reset
        </a>
       `)
     })
     // 4 return the new message
     return { message : "Thanks!"}

  },
  async resetPassword(parent, args, ctx, info){
     // 1. check if the password match
     if(args.password !== args.confirmPassword){
        throw new Error("Your passwords don't match!")
     }
     //2. check if its a legit reset token
     //3. check if its expired
     const [user] = await ctx.db.query.users({
       where:{
         resetToken: args.resetToken,
         resetTokenExpiry_gte: Date.now() - 3600000
       }
     });
     if(!user){
       throw new Error('This token is either invalid or expired!');
     }
     // 4. hash the password
     const password = await bcrypt.hash(args.password, 10);
     // 5. save the new password and remove the old resetToken fields
     const updatedUser = await ctx.db.mutation.updateUser({
       where: { email: user.email },
       data:{
         password,
         resetToken: null,
         resetTokenExpiry: null,
       },
     });
     // 6.. Generate the jwt
     const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
     // 7.. set the jwt cookie
     ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // 8 return the new user
    return updatedUser;
  },
 async updatePermissions(parent, args, ctx, info){
     // 1 check if the user logged in
     if(!ctx.request.userId){
        throw new Error('You must be logged in!')
     }
     // 2 Query the current user
     const currentUser = await ctx.db.query.user(
       {
         where:{
           id: ctx.request.userId,
         },
       },
       info
     );
     // 3 check if the have permission to do this
     hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE'])
     //4 Update the permissions
     return ctx.db.mutation.updateUser({
       data:{
         permissions: {
           set: args.permissions,
         },
       },
       where: {
         id: args.userId
       },
     }, info)
  },
  async addToCart(parent, args, ctx, info){
    // 1 . make sure they are signed in
    const { userId } = ctx.request;
    if(!userId){
      throw new Error('You must be signed in!')
    }
    // 2 . Query the users current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where:{
        user: { id : userId },
        item: { id: args.id }
      }
    });
    // 3 . check if that item is already in their cart and increment by 1 if it is
    if(existingCartItem){
       return ctx.db.mutation.updateCartItem({
         where:{
           id: existingCartItem.id,
         },
         data: { quantity: existingCartItem.quantity + 1 },
       }, info);
    }
    // 4. if its not , create a fresh CartItem for that user!
    return ctx.db.mutation.createCartItem({
      data:{
        user: {
          connect: { id: userId},
        },
        item: {
          connect: { id: args.id},
        },
      },
    }, info);
  },
  async removeFromCart(parent, args, ctx, info){
    //1 Find the cart Item
    const cartItem = await ctx.db.query.cartItem({
      where:{
        id: args.id
      }
    }, `{id, user { id } }`)
    //2 make sure we found an item
    if(!cartItem) throw new Error('No CartItem Found!');
    //3 make sure the own that cart Item
    if(ctx.request.userId !== cartItem.user.id){
      throw new Error('Not Your Item')
    }
    //3 Delete that cart item
    return ctx.db.mutation.deleteCartItem({
      where: {
        id: args.id,
      }
    }, info)
  },
  async createOrder(parent, args, ctx, info){
    //1 Query the current user and make sure the are signed in
    const { userId } = ctx.request;
    if(!userId){
      throw new Error('You must be signed in!')
    }
    const user = await ctx.db.query.user({ where : { id: userId }},`
     {
      id
      email
      name
      cart {
        id
        quantity
        item {
          title
          price
          description
          id
          image
          largeImage
        }}}
    `)

    //2 we need to re calculate the total for the price
    const amount = user.cart.reduce((tally, cartItem) => tally + cartItem.item.price * cartItem.quantity, 0);
    //3 create the stripe charge turn token received from client to money
    const charge = await stripe.charges.create({
      amount,
      currency: 'USD',
      source: args.token,
    })
    //4 convert the cartItems to Orders Items
    const orderItems = user.cart.map(cartItem => {
      const orderItem = {
        ...cartItem.item,
        quantity: cartItem.quantity,
        user:{ connect: { id: userId } },
      }
      delete orderItem.id;
      return orderItem;
    });
    //5 create the order
    const order = await ctx.db.mutation.createOrder({
      data:{
        total: charge.amount,
        charge: charge.id,
        items: { create: orderItems },
        user: { connect: { id: userId } },
      }
    })
    //6 clear the users cart. delete cart items
    const cartItemIds = user.cart.map(cartItem => cartItem.id);
    await ctx.db.mutation.deleteManyCartItems({
      where:{
        id_in: cartItemIds
      }
    })
    //7 return the order to client
    return order
  }
};

module.exports = mutations;
