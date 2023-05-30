module.exports = function ({ env }) {
  if (env === 'test') {
    return {
      babel: {
        plugins: [
          // use babel-plugin-transform-import-meta in jest because it can't work with import.meta.url
          // that is required to import web workers in webpack 5
          'babel-plugin-transform-import-meta',
        ],
      },
    };
  }

  return {};
};
