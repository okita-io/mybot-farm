/**
 * Existing contacts who opted out stay opted out. We still return success to
 * the caller so the public signup form never reveals subscription status.
 */
export function shouldAddExistingContactToSegment(contact: {
  unsubscribed: boolean;
}) {
  return !contact.unsubscribed;
}
