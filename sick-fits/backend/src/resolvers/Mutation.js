const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');

const mutations = {
  async createItem(parent, args, ctx, info) {
    // TODO if the user are loggedIn
    const item = await ctx.db.mutation.createItem({
      data: {
        ...args
      }
    }, info);

    return item;
  },
  updateItem(parent, args, ctx, info) {
    // first take copy of updates
    const updates = { ...args };
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
    const item = await ctx.db.query.item({ where }, `{  id  title }`)
    // permission to deleteitem TODO
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
     })
     console.log(res)
     return { message : "Thanks!"}
     // Email them that reset token

  }
};

module.exports = mutations;
