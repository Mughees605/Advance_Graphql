const { forwardTo } = require("prisma-binding");
const { hasPermission } = require("./../utils");

const Query = {
  items: forwardTo('db'),
  item: forwardTo('db'),
  itemsConnection: forwardTo('db'),
  me(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      return null;
    }
    return ctx.db.query.user({
      where: {
        id: ctx.request.userId
      }
    }, info)
  },
  async users(parent, args, ctx, info) {
    // 1. check if they are logged in
    if (!ctx.request.userId) {
      throw new Error("You must be logged in!")
    }
    // 2. check if the user have the permission to query all the users
    hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE'])

    // 3. if the user have above permissions ['ADMIN', 'PERMISSIONUPDATE'] then send all users
    return ctx.db.query.users({}, info)
  },
  async order(parent, args, ctx, info) {
    //1 Make sure loggedIn
    if (!ctx.request.userId) {
      throw new Error("You must be logged in!")
    }
    //2 Query the current order
    const order = await ctx.db.query.order({
      where: {
        id: args.id
      }
    }, info);
    //3 check permission
    const ownsOrder = order.user.id === ctx.request.userId;
    const hasPermissionToSeeOrder = ctx.request.user.permissions.includes('ADMIN');

    if (!ownsOrder || !hasPermission) {
      throw new Error('You Cant see this buddy');
    }

    //4 Return the order
    return order;
  },
  async orders(parent, args, ctx, info) {
    console.log(info)
    //1 Make sure loggedIn
    if (!ctx.request.userId) {
      throw new Error("You must be logged in!")
    }

    //2 Query  orders
    const orders = await ctx.db.query.orders({
      where: {
        user: {
          id: ctx.request.userId
        }
      }
    }, info);
     
    return orders;
  }
};

module.exports = Query;
