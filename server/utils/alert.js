import nodemailer from 'nodemailer';

export const sendAlert = async (vulns) => {
  const criticals = vulns.filter(v => v.severity === 'CRITICAL');
  if (!criticals.length) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ton.email@gmail.com',
      pass: 'tonMotDePasse',
    },
  });

  const mailOptions = {
    from: 'alerte@vulnguard.com',
    to: 'admin@vulnguard.com',
    subject: '[CRITICAL] Vulnérabilités détectées',
    text: JSON.stringify(criticals, null, 2),
  };

  await transporter.sendMail(mailOptions);
};
