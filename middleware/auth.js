const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers[ 'authorization' ];
    const token = authHeader && authHeader.split(' ')[ 1 ];

    if (!token) {
        return res.status(401).json({ error: 'no token' });
    }
    jwt.verify(token, process.env.KEY, (error, user) => {
        if (error) {
            return res.status(401).json({ error: 'error' });
        }
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
