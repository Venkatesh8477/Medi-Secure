function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32 || /replace|change[_ -]?me|your[_ -].*secret/i.test(secret)) return null;
    return secret;
}

module.exports = { getJwtSecret };
