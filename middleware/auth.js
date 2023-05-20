const jwt = require('jsonwebtoken');


const authenticateToken = (req, res, next) => {
    const authHeader = req.headers[ 'authorization' ];
    const token = authHeader && authHeader.split(' ')[ 1 ];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Verify the admin token
        const adminPayload = jwt.verify(token, process.env.ADMIN_KEY);
        // Proceed with the request for admin
        req.user = adminPayload;
        next();
    } catch (adminError) {
        try {
            // Verify the user token
            const userPayload = jwt.verify(token, process.env.USER_KEY);

            // Proceed with the request for user
            req.user = userPayload;
            next();
        } catch (userError) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
    }
};
module.exports = authenticateToken;