const Mailer = {

  generateHeader: function() {
    return (
      `
        <html>
          <body>
            <style>
              body {
                margin: 30px auto;
                font-family: sans-serif;
                max-width: 600px;
                background-color: #DDDDDD;
              }

              .header {
                background-color: #070948;
                color: white;
                padding: 20px;
                font-size: 36px;
                text-transform: uppercase;
                text-align: center;
                width: 100%;
                border-radius: 5px 5px 0 0;
              }

              .body {
                margin: 0 auto;
                padding: 40px;
                max-width: 600px;
                background-color: #FFFFFF;
                min-height: 400px;
              }

              thead, tbody, tr, td, th {
                display: block;
              }

              .content {
                text-align: center;
              }

              .cta-button {
                background-color: #9A6197;
                color: white;
                padding: 10px 16px;
                border-radius: 20px;
                text-decoration: none;
                margin: 20px;
                display: inline-block;
              }

              .cta-button:hover {
                background-color: #894586;
              }

              .footer {
                background-color: #070948;
                color: white;
                padding: 10px;
                font-size: 14px;
                text-align: center;
                width: 100%;
                border-radius: 0 0 5px 5px;
              }

              .footer p {
                text-align: center;
              }

              p {
                margin: 12px 0;
                line-height: 1.5em;
                text-align: left;
              }
            </style>

            <table class="header">
              <tr>
                <td>
                  The Back Beat
                </td>
              </tr>
            </table>
          `
    );
  },

  generateFooter: function() {
    return(
      `
        <table class="footer">
          <tr>
            <td>
              <p>
                &copy; 2017 The Back Beat
              </p>
            </td>
          </tr>
        </table>
        </body>
        </html>
      `
    );
  },

  transport: {
    // host: 'smtp.gmail.com',
    // port: 465,
    // secure: true,
    // auth: {
    //   user: 'thebackbeatproject@gmail.com',
    //   pass: process.env.EMAILPASS
    // }

    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "5bd2bd76064b1a",
      pass: "2f5d62f63c74b1"
    }
  }
}

module.exports = Mailer;