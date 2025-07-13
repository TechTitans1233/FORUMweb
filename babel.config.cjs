module.exports = {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current', // Match your current Node.js version
          },
        },
      ],
    ],
  };