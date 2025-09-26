// 🔐 Authentication Controller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Dinamičen uvoz modela glede na DEMO_MODE
let User;
console.log('DEMO_MODE:', process.env.DEMO_MODE);
if (process.env.DEMO_MODE === 'true') {
  User = require('../models/DemoUser');
  console.log('Loaded DemoUser model');
} else {
  User = require('../models/User');
  console.log('Loaded User model');
}

// Helper funkcije
const generateToken = (userId, email, isAdmin = false) => {
  return jwt.sign(
    { userId, email, isAdmin },
    process.env.JWT_SECRET || 'omni-cloud-secret-key',
    { expiresIn: '24h' }
  );
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sanitizeUserData = (user) => {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

// 📝 Registracija uporabnika
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, company } = req.body;
    
    // Validacija
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email in geslo sta obvezna" 
      });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Neveljaven email format" 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Geslo mora imeti vsaj 6 znakov" 
      });
    }
    
    // Preveri, če uporabnik že obstaja
    console.log('Checking for existing user with email:', email.toLowerCase());
    console.log('User model methods:', Object.getOwnPropertyNames(User));
    console.log('User.findOne type:', typeof User.findOne);
    
    let existingUser;
    if (process.env.DEMO_MODE === 'true') {
      existingUser = await User.findOne({ email: email.toLowerCase() });
    } else {
      existingUser = await User.findOne({ email: email.toLowerCase() });
    }
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Uporabnik s tem emailom že obstaja" 
      });
    }
    
    // Hashiraj geslo
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Ustvari uporabnika
    const userData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      profile: {
        firstName: firstName || '',
        lastName: lastName || '',
        company: company || ''
      },
      plan: {
        type: 'free',
        status: 'active',
        startDate: new Date(),
        endDate: null
      },
      status: 'active',
      createdAt: new Date()
    };

    let user;
    if (process.env.DEMO_MODE === 'true') {
      user = new User(userData);
      await user.save();
    } else {
      user = new User(userData);
      await user.save();
    }
    
    // Generiraj token
    const token = generateToken(user._id || user.id, user.email, user.isAdmin);
    
    res.status(201).json({
      success: true,
      message: "Uporabnik uspešno registriran",
      token,
      user: sanitizeUserData(user)
    });

  } catch (error) {
    console.error('Registration napaka:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Napaka pri registraciji",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔑 Prijava uporabnika
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email in geslo sta obvezna" 
      });
    }
    
    // Najdi uporabnika
    let user;
    if (process.env.DEMO_MODE === 'true') {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      user = await User.findOne({ email: email.toLowerCase() });
    }
    
    console.log('Najden uporabnik:', user);
    console.log('Uporabnik geslo:', user ? user.password : 'ni uporabnika');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Napačen email ali geslo" 
      });
    }

    // Preveri status uporabnika
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        success: false, 
        message: "Vaš račun je začasno suspendiran" 
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ 
        success: false, 
        message: "Vaš račun je blokiran" 
      });
    }
    
    // Preveri geslo
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Napačen email ali geslo" 
      });
    }
    
    // Posodobi zadnjo prijavo
    if (process.env.DEMO_MODE === 'true') {
      user.lastLogin = new Date();
    } else {
      await User.findByIdAndUpdate(user._id, { 
        lastLogin: new Date() 
      });
    }
    
    // Generiraj token
    const token = generateToken(user._id || user.id, user.email, user.isAdmin);
    
    res.json({
      success: true,
      message: "Uspešna prijava",
      token,
      user: sanitizeUserData(user)
    });

  } catch (error) {
    console.error('Login napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: "Napaka pri prijavi" 
    });
  }
};

// 👤 Pridobi profil uporabnika
const getProfile = async (req, res) => {
  try {
    let user;
    if (process.env.DEMO_MODE === 'true') {
      user = User.findById(req.user.userId);
    } else {
      user = await User.findById(req.user.userId).select('-password');
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Uporabnik ni najden" 
      });
    }
    
    res.json({
      success: true,
      user: sanitizeUserData(user)
    });

  } catch (error) {
    console.error('Get profile napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: "Napaka pri pridobivanju profila" 
    });
  }
};

// ✏️ Posodobi profil uporabnika
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, company, phone } = req.body;
    
    const updateData = {
      'profile.firstName': firstName,
      'profile.lastName': lastName,
      'profile.company': company,
      'profile.phone': phone,
      updatedAt: new Date()
    };

    let user;
    if (process.env.DEMO_MODE === 'true') {
      user = User.findById(req.user.userId);
      if (user) {
        Object.assign(user.profile, {
          firstName,
          lastName,
          company,
          phone
        });
        user.updatedAt = new Date();
      }
    } else {
      user = await User.findByIdAndUpdate(
        req.user.userId,
        updateData,
        { new: true }
      ).select('-password');
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Uporabnik ni najden" 
      });
    }
    
    res.json({
      success: true,
      message: "Profil uspešno posodobljen",
      user: sanitizeUserData(user)
    });

  } catch (error) {
    console.error('Update profile napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: "Napaka pri posodabljanju profila" 
    });
  }
};

// 🔄 Spremeni geslo
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Trenutno in novo geslo sta obvezna" 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Novo geslo mora imeti vsaj 6 znakov" 
      });
    }
    
    // Najdi uporabnika
    let user;
    if (process.env.DEMO_MODE === 'true') {
      user = User.findById(req.user.userId);
    } else {
      user = await User.findById(req.user.userId);
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Uporabnik ni najden" 
      });
    }
    
    // Preveri trenutno geslo
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: "Trenutno geslo ni pravilno" 
      });
    }
    
    // Hashiraj novo geslo
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Posodobi geslo
    if (process.env.DEMO_MODE === 'true') {
      user.password = hashedNewPassword;
      user.updatedAt = new Date();
    } else {
      await User.findByIdAndUpdate(req.user.userId, {
        password: hashedNewPassword,
        updatedAt: new Date()
      });
    }
    
    res.json({
      success: true,
      message: "Geslo uspešno spremenjeno"
    });

  } catch (error) {
    console.error('Change password napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: "Napaka pri spreminjanju gesla" 
    });
  }
};

// 🔄 Osveži token
const refreshToken = async (req, res) => {
  try {
    // Token je že preverjen v middleware
    const token = generateToken(req.user.userId, req.user.email, req.user.isAdmin);
    
    res.json({
      success: true,
      message: "Token uspešno osvežen",
      token
    });

  } catch (error) {
    console.error('Refresh token napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: "Napaka pri osveževanju tokena" 
    });
  }
};

// 🚪 Odjava uporabnika
const logout = (req, res) => {
  try {
    // V demo načinu samo vrnemo uspešen odgovor
    // V produkciji bi lahko dodali blacklist tokenov
    
    res.json({
      success: true,
      message: "Uspešna odjava"
    });

  } catch (error) {
    console.error('Logout napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: "Napaka pri odjavi" 
    });
  }
};

// 📧 Pozabljeno geslo
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Veljaven email je obvezen" 
      });
    }
    
    // Poišči uporabnika
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Iz varnostnih razlogov vrnemo uspešen odgovor tudi če uporabnik ne obstaja
      return res.status(200).json({ 
        success: true, 
        message: "Če email obstaja, so bila poslana navodila za ponastavitev gesla" 
      });
    }
    
    // Generiraj reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 ura
    
    // Shrani reset token v bazo
    if (process.env.DEMO_MODE === 'true') {
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();
    } else {
      await User.updateOne(
        { _id: user._id },
        { 
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpiry
        }
      );
    }
    
    // Nastavi email transporter (za demo uporabimo console.log)
    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
      console.log('🔐 Reset Password Token:', resetToken);
      console.log('🔗 Reset URL:', `http://localhost:3002/reset-password?token=${resetToken}`);
      
      return res.status(200).json({ 
        success: true, 
        message: "Navodila za ponastavitev gesla so bila poslana na vaš email",
        // V development mode vrnemo token za testiranje
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      });
    }
    
    // V produkciji pošlji pravi email
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Ponastavitev gesla - Omni Platform',
      html: `
        <h2>Ponastavitev gesla</h2>
        <p>Prejeli ste to sporočilo, ker ste zahtevali ponastavitev gesla za vaš račun.</p>
        <p>Kliknite na spodnjo povezavo za ponastavitev gesla:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ponastavi geslo</a>
        <p>Ta povezava bo veljavna 1 uro.</p>
        <p>Če niste zahtevali ponastavitve gesla, ignorirajte to sporočilo.</p>
      `
    });
    
    res.status(200).json({ 
      success: true, 
      message: "Navodila za ponastavitev gesla so bila poslana na vaš email" 
    });
    
  } catch (error) {
    console.error('Forgot password napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: "Napaka pri pošiljanju emaila" 
    });
  }
};

// 🔄 Ponastavitev gesla
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Token in novo geslo sta obvezna" 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Geslo mora imeti vsaj 6 znakov" 
      });
    }
    
    // Poišči uporabnika z veljavnim tokenом
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Neveljaven ali potekel token" 
      });
    }
    
    // Hashiraj novo geslo
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Posodobi geslo in pobriši reset token
    if (process.env.DEMO_MODE === 'true') {
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    } else {
      await User.updateOne(
        { _id: user._id },
        { 
          password: hashedPassword,
          $unset: { 
            resetPasswordToken: 1,
            resetPasswordExpires: 1
          }
        }
      );
    }
    
    res.status(200).json({ 
      success: true, 
      message: "Geslo je bilo uspešno ponastavljeno" 
    });
    
  } catch (error) {
    console.error('Reset password napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: "Napaka pri ponastavitvi gesla" 
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
};