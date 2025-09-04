// src/modules/auth/controller/auth.controller.js
import passport from "passport";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
 
const prisma = new PrismaClient();
 
export const loginWithGitHub = passport.authenticate("github", { scope: ["user:email"] });
 
// 🔁 Callback de GitHub (Passport ya autenticó y puso req.user)
export const githubCallback = (req, res, next) => {
  passport.authenticate("github", { session: false }, async (err, user, info) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login-failed`);
    }
 
    try {
      
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1d" });
 
      // Enviar cookie segura
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 24 * 60 * 60 * 1000, // 1 día
      });
 
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error("Error en githubCallback:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  })(req, res, next);
};
 
// 👤 Obtener perfil completo
export const getProfile = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "No autenticado" });
 
  try {
    const user = await prisma.user.findUnique({
      where: { githubId: req.user.githubId },
      select: {
        pointsBalance: true,
        profile: { select: { level: true } },
        assignedBadges: {
          select: {
            badge: { select: { name: true, description: true } },
          },
        },
      },
    });
 
    if (!user) {
      return res.status(404).json({ message: "Perfil de usuario no encontrado en la base de datos." });
    }
 
    const badges = user.assignedBadges.map((ub) => ({
      name: ub.badge.name,
      description: ub.badge.description,
    }));
 
    const profileData = {
      ...req.user,
      points: user.pointsBalance ?? 0,
      level: user.profile?.level ?? 1,
      badges,
    };
 
    res.json(profileData);
  } catch (err) {
    console.error("Error al obtener perfil:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
 
// 🚪 Logout
export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
 
    if (typeof req.logout === "function") {
      req.logout(() => {});
    }
 
    return res.redirect(process.env.FRONTEND_URL || "http://localhost:5173");
  } catch (err) {
    console.error("Error al cerrar sesión:", err);
    return res.status(500).json({ message: "Error al cerrar sesión" });
  }
};