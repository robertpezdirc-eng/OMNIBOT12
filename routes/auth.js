// 🌟 Omni AI Platform - Authentication Routes
// Prijava, registracija, upravljanje tokenov

const express = require('express');
const User = require('../models/User');
const AuthMiddleware = require('../middleware/auth');

function createAuthRoutes(db, config) {
    const router = express.Router();
    const userModel = new User(db);
    const authMiddleware = new AuthMiddleware(db, config.jwt.secret);

    // 📝 Registracija novega uporabnika
    router.post('/register', async (req, res) => {
        try {
            const { username, email, password, role, profile } = req.body;

            // Validacija vhodnih podatkov
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Uporabniško ime, email in geslo so obvezni'
                });
            }

            // Preveri moč gesla
            const passwordValidation = authMiddleware.validatePasswordStrength(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Geslo ni dovolj močno',
                    details: passwordValidation.errors
                });
            }

            // Ustvari uporabnika
            const result = await userModel.createUser({
                username,
                email,
                password,
                role: role || 'client',
                profile: profile || {}
            });

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.error
                });
            }

            // Generiraj tokena
            const token = authMiddleware.generateToken(result.user);
            const refreshToken = authMiddleware.generateRefreshToken(result.user);

            res.status(201).json({
                success: true,
                message: 'Uporabnik uspešno registriran',
                token,
                refreshToken,
                user: {
                    id: result.userId,
                    username: result.user.username,
                    email: result.user.email,
                    role: result.user.role,
                    profile: result.user.profile
                }
            });
        } catch (error) {
            console.error('Napaka pri registraciji:', error);
            res.status(500).json({
                success: false,
                error: 'Napaka pri registraciji uporabnika'
            });
        }
    });

    // 🔐 Prijava uporabnika
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email in geslo sta obvezna'
                });
            }

            // Avtenticiraj uporabnika
            const result = await userModel.authenticateUser(email, password);

            if (!result.success) {
                return res.status(401).json({
                    success: false,
                    error: result.error
                });
            }

            // Generiraj tokena
            const token = authMiddleware.generateToken(result.user);
            const refreshToken = authMiddleware.generateRefreshToken(result.user);

            res.json({
                success: true,
                message: 'Uspešna prijava',
                token,
                refreshToken,
                user: {
                    id: result.user._id,
                    username: result.user.username,
                    email: result.user.email,
                    role: result.user.role,
                    profile: result.user.profile,
                    licenseInfo: result.user.licenseInfo
                }
            });
        } catch (error) {
            console.error('Napaka pri prijavi:', error);
            res.status(500).json({
                success: false,
                error: 'Napaka pri prijavi'
            });
        }
    });

    // 🔄 Osveži token
    router.post('/refresh', async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    error: 'Refresh token je obvezen'
                });
            }

            const result = await authMiddleware.refreshToken(refreshToken);

            if (!result.success) {
                return res.status(401).json({
                    success: false,
                    error: result.error
                });
            }

            res.json(result);
        } catch (error) {
            console.error('Napaka pri osvežitvi tokena:', error);
            res.status(500).json({
                success: false,
                error: 'Napaka pri osvežitvi tokena'
            });
        }
    });

    // 👤 Pridobi podatke trenutnega uporabnika
    router.get('/me', authMiddleware.authenticateToken(), async (req, res) => {
        try {
            const user = await userModel.getUserById(req.user.id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Uporabnik ni najden'
                });
            }

            res.json({
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    profile: user.profile,
                    licenseInfo: user.licenseInfo,
                    permissions: user.permissions,
                    createdAt: user.createdAt,
                    lastLoginAt: user.lastLoginAt
                }
            });
        } catch (error) {
            console.error('Napaka pri pridobivanju uporabnika:', error);
            res.status(500).json({
                success: false,
                error: 'Napaka pri pridobivanju podatkov uporabnika'
            });
        }
    });

    // ✏️ Posodobi profil uporabnika
    router.put('/profile', authMiddleware.authenticateToken(), async (req, res) => {
        try {
            const { profile, currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            let updateData = {};

            // Posodobi profil
            if (profile) {
                updateData.profile = profile;
            }

            // Spremeni geslo, če je podano
            if (newPassword) {
                if (!currentPassword) {
                    return res.status(400).json({
                        success: false,
                        error: 'Trenutno geslo je obvezno za spremembo gesla'
                    });
                }

                // Preveri trenutno geslo
                const user = await userModel.collection.findOne({ _id: new ObjectId(userId) });
                const isValidPassword = await bcrypt.compare(currentPassword, user.password);
                
                if (!isValidPassword) {
                    return res.status(400).json({
                        success: false,
                        error: 'Trenutno geslo ni pravilno'
                    });
                }

                // Preveri moč novega gesla
                const passwordValidation = authMiddleware.validatePasswordStrength(newPassword);
                if (!passwordValidation.isValid) {
                    return res.status(400).json({
                        success: false,
                        error: 'Novo geslo ni dovolj močno',
                        details: passwordValidation.errors
                    });
                }

                updateData.password = newPassword;
            }

            const result = await userModel.updateUser(userId, updateData);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.error
                });
            }

            res.json({
                success: true,
                message: 'Profil uspešno posodobljen'
            });
        } catch (error) {
            console.error('Napaka pri posodabljanju profila:', error);
            res.status(500).json({
                success: false,
                error: 'Napaka pri posodabljanju profila'
            });
        }
    });

    // 🚪 Odjava (blacklist token - opcijsko)
    router.post('/logout', authMiddleware.authenticateToken(), async (req, res) => {
        try {
            // V prihodnosti lahko dodamo blacklist za tokene
            // Za zdaj samo vrnemo uspešen odgovor
            
            res.json({
                success: true,
                message: 'Uspešna odjava'
            });
        } catch (error) {
            console.error('Napaka pri odjavi:', error);
            res.status(500).json({
                success: false,
                error: 'Napaka pri odjavi'
            });
        }
    });

    // 🔍 Preveri veljavnost tokena
    router.get('/verify', authMiddleware.authenticateToken(), (req, res) => {
        res.json({
            success: true,
            message: 'Token je veljaven',
            user: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role,
                permissions: req.user.permissions
            }
        });
    });

    // 📊 Statistike avtentikacije (samo admin)
    router.get('/stats', 
        authMiddleware.authenticateToken(),
        authMiddleware.requireRole('admin'),
        async (req, res) => {
            try {
                const stats = await userModel.getUserStats();
                
                res.json({
                    success: true,
                    stats
                });
            } catch (error) {
                console.error('Napaka pri pridobivanju statistik:', error);
                res.status(500).json({
                    success: false,
                    error: 'Napaka pri pridobivanju statistik'
                });
            }
        }
    );

    return router;
}

module.exports = createAuthRoutes;