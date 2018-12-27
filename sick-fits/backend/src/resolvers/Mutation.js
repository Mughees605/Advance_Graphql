const mutations = {
  async createItem(parent, args, ctx, info) {
    // TODO if they are loggedIn
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

  }
};

module.exports = mutations;
