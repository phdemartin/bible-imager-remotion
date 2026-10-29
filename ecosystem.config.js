
module.exports = {
    apps: [
        {
            name: 'bible-imager-remotion',
            script: 'npm',
            args: 'start',
            cwd: './',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3002,
            },
        },
    ],
};
