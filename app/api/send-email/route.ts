import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

const formatSimpleDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      type,
      employeeId,
      requestId,
      recipientEmail,
      firstName,
      pin,
      privateLinkId,
      requestType,
      startDate,
      endDate,
      startTime,
      endTime,
      notes,
    } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Email destinatario mancante' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtps.aruba.it',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://toddebus.it';
    const privateLink = privateLinkId ? `${origin}/private/${privateLinkId}` : `${origin}/private`;

    let subject = '';
    let emailContentHtml = '';

    const formattedPeriod = `${formatSimpleDate(startDate)}${endDate ? ` → ${formatSimpleDate(endDate)}` : ''}`;
    const formattedHours = startTime && endTime ? ` dalle ${startTime} alle ${endTime}` : '';

    switch (type) {
      case 'credentials':
        subject = `Credenziali di Accesso - Todde Bus`;
        emailContentHtml = `
          <h2 style="color: #852136; margin-top: 0;">Accesso Area Personale Todde Bus</h2>
          <p>Ciao <strong>${firstName}</strong>,</p>
          <p>Ti informo che, a partire da oggi, sarà introdotto un nuovo canale dedicato alla gestione delle presenze e delle assenze del personale.</p>
          <p>Attraverso il nuovo portale sarà possibile inserire e inoltrare tutte le richieste relative a: <strong>ferie, permessi, congedi e malattia</strong>.</p>
          <p>Tutte le richieste e le comunicazioni dovranno essere effettuate esclusivamente tramite il nuovo gestionale, pertanto non verranno più prese in considerazione le richieste inviate attraverso altri canali, quali e-mail, messaggi o comunicazioni verbali.</p>
          <p>Di seguito trovi i tuoi dati riservati per accedere alla tua area privata:</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #852136; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Il tuo PIN:</strong> <span style="font-size: 20px; font-weight: bold; color: #852136; letter-spacing: 2px;">${pin}</span></p>
            <p style="margin: 0; font-size: 14px;"><strong>Link di accesso diretto:</strong><br/>
              <a href="${privateLink}" style="color: #2563eb; word-break: break-all;">${privateLink}</a>
            </p>
          </div>
          <p style="font-size: 13px; color: #64748b;">Custodisci questo link e il tuo PIN con cura.</p>
        `;
        break;

      case 'approved':
        subject = `Richiesta Approvata ✅ - Todde Bus`;
        emailContentHtml = `
          <h2 style="color: #16a34a; margin-top: 0;">Richiesta Approvata ✅</h2>
          <p>Ciao <strong>${firstName}</strong>,</p>
          <p>Ti confermiamo che la tua richiesta di <strong>${requestType}</strong> è stata <strong>APPROVATA</strong>.</p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0 0 6px 0;"><strong>Tipologia:</strong> ${requestType}</p>
            <p style="margin: 0 0 6px 0;"><strong>Periodo:</strong> ${formattedPeriod}</p>
            ${formattedHours ? `<p style="margin: 0 0 6px 0;"><strong>Orario:</strong> ${formattedHours}</p>` : ''}
            ${notes ? `<p style="margin: 0;"><strong>Note amministrazione:</strong> ${notes}</p>` : ''}
          </div>
          <div style="margin-top: 20px; padding: 12px; background-color: #f8fafc; border-radius: 6px; font-size: 13px;">
            Puoi verificare il riepilogo nella tua Area Personale:<br/>
            <a href="${privateLink}" style="color: #2563eb; word-break: break-all;">${privateLink}</a>
          </div>
        `;
        break;

      case 'rejected':
        subject = `Richiesta Non Accolta ❌ - Todde Bus`;
        emailContentHtml = `
          <h2 style="color: #dc2626; margin-top: 0;">Richiesta Non Accolta ❌</h2>
          <p>Ciao <strong>${firstName}</strong>,</p>
          <p>Ti informiamo che la tua richiesta di <strong>${requestType}</strong> per il periodo <strong>${formattedPeriod}</strong> non è stata accolta.</p>
          ${notes ? `
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0;"><strong>Motivazione:</strong> ${notes}</p>
          </div>` : ''}
          <p style="font-size: 13px; color: #64748b;">Per eventuali chiarimenti puoi rivolgerti all'ufficio del personale.</p>
        `;
        break;

      case 'modified':
        subject = `Variazione Richiesta 📝 - Todde Bus`;
        emailContentHtml = `
          <h2 style="color: #2563eb; margin-top: 0;">Variazione Richiesta 📝</h2>
          <p>Ciao <strong>${firstName}</strong>,</p>
          <p>Ti informiamo che la tua richiesta di <strong>${requestType}</strong> ha subito una <strong>variazione</strong> da parte dell'amministrazione.</p>
          <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0 0 6px 0;"><strong>Nuovo Periodo:</strong> ${formattedPeriod}</p>
            ${formattedHours ? `<p style="margin: 0 0 6px 0;"><strong>Nuovo Orario:</strong> ${formattedHours}</p>` : ''}
            ${notes ? `<p style="margin: 0;"><strong>Note di aggiornamento:</strong> ${notes}</p>` : ''}
          </div>
          <p style="margin-top: 15px;"><strong>Si prega di riscontrare la presente comunicazione rispondendo direttamente a questo messaggio per confermare o rifiutare la variazione.</strong></p>
          <div style="margin-top: 20px; padding: 12px; background-color: #f8fafc; border-radius: 6px; font-size: 13px;">
            Verifica la tua Area Personale aggiornata:<br/>
            <a href="${privateLink}" style="color: #2563eb; word-break: break-all;">${privateLink}</a>
          </div>
        `;
        break;

      default:
        return NextResponse.json({ error: 'Tipo notifica non valido' }, { status: 400 });
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
            <div style="background-color: #852136; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">TODDE BUS</h1>
              <span style="color: #fecdd3; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Gestione Personale & Permessi</span>
            </div>
            <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
              ${emailContentHtml}
            </div>
            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px;">
              <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 13px; color: #333333; width: 100%;">
                <tr>
                  <td style="padding-right: 15px; vertical-align: top; width: 110px;">
                    <img src="https://www.toddebus.com/wp-content/uploads/2026/10/firma_todebus.jpeg" alt="Todde Bus Logo" width="100" style="display: block; border-radius: 4px;">
                  </td>
                  <td style="vertical-align: top; border-left: 2px solid #852136; padding-left: 15px;">
                    <strong style="color: #852136; font-size: 14px;">Ufficio del personale</strong><br>
                    <span style="color: #555555; font-size: 12px; line-height: 1.4; display: inline-block; margin-top: 4px;">
                      Via dell'Omo 171 - 00155 - Roma<br>
                      Tel: 0669281830<br>
                      Email: <a href="mailto:personale@toddebus.it" style="color: #852136; text-decoration: none;">personale@toddebus.it</a>
                    </span>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      bcc: process.env.ADMIN_BCC_EMAIL || undefined,
      subject: subject,
      html: fullHtml,
    });

    await supabase.from('tbpr_email_logs').insert([
      {
        employee_id: employeeId || null,
        request_id: requestId || null,
        recipient_email: recipientEmail,
        email_type: type,
        subject: subject,
        status: 'inviata',
      },
    ]);

    return NextResponse.json({ success: true, message: 'Email inviata con successo!' });
  } catch (error: any) {
    console.error("Errore invio email:", error);
    return NextResponse.json({ error: error.message || "Errore durante l'invio" }, { status: 500 });
  }
}