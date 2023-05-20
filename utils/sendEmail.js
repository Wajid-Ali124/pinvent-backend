const sgMail = require("@sendgrid/mail");

const sendEmail = async (subject, message, send_to, sent_from, reply_to) => {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
        to: send_to,
        from: sent_from,
        replyTo: reply_to,
        subject: subject,
        html: message,
    };

    try {
        await sgMail.send(msg);
        console.log("Email sent successfully");
    } catch (error) {
        console.error(error);
    }
};

module.exports = sendEmail;
