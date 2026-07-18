import { whatsappLink } from '../config'

export function WhatsAppFloat() {
  return (
    <a
      className="wa-float"
      href={whatsappLink('Hi Doorswala! I have a question about your doors.')}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12.04 2a9.9 9.9 0 0 0-8.55 14.9L2 22l5.25-1.45A9.9 9.9 0 1 0 12.04 2Zm0 1.67a8.23 8.23 0 1 1-4.2 15.3l-.3-.18-3.12.86.86-3.04-.2-.31a8.23 8.23 0 0 1 6.96-12.63Zm-3.1 4.1c-.19 0-.5.07-.76.36-.26.28-1 .97-1 2.37 0 1.4 1.02 2.76 1.16 2.95.15.19 2 3.05 4.86 4.15 2.37.94 2.86.75 3.37.7.52-.04 1.66-.68 1.9-1.33.23-.66.23-1.22.16-1.34-.07-.11-.26-.18-.54-.32-.28-.14-1.66-.82-1.92-.91-.26-.1-.45-.14-.63.14-.19.28-.73.9-.9 1.09-.16.19-.33.21-.61.07a7.7 7.7 0 0 1-2.26-1.4 8.5 8.5 0 0 1-1.57-1.95c-.16-.28-.02-.43.12-.57.13-.13.31-.33.45-.5.14-.16.19-.28.28-.47.1-.19.05-.35-.02-.5-.07-.14-.61-1.54-.86-2.1-.22-.5-.45-.5-.63-.5h-.6Z"
        />
      </svg>
    </a>
  )
}
