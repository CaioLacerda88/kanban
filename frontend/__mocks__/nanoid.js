let counter = 0;
module.exports = {
  nanoid: () => `id-${++counter}`,
};
