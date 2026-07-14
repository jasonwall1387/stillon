import { COPY } from './copy';

export function makeEmailSender(apiKey: string) {
  return async function sendResolutionEmail(
    to: string, status: 'cancelled' | 'stands', title: string,
  ): Promise<void> {
    const subject = status === 'cancelled' ? COPY.emailSubjectCancelled : COPY.emailSubjectStands;
    const body = status === 'cancelled'
      ? `${COPY.cancelledHeading}\n\n${COPY.cancelledBody(title)}`
      : `${COPY.standsHeading}\n\n${COPY.standsBody}`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Still On? <hello@stillon.io>',
        to: [to], subject, text: body,
      }),
    });
    if (!res.ok) throw new Error(`resend: ${res.status}`);
  };
}
