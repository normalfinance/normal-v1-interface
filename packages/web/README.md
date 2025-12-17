This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

To configure the application, you can use a `.env.local` file in the `packages/web` directory. Create one based on `.env.example` if it exists.

### Mnemonic Encryption

The application uses server-side encryption for storing wallet mnemonics when platform custody is enabled. This requires a server secret:

- `MNEMONIC_ENCRYPTION_SECRET`: A secure random secret used for server-side mnemonic encryption. Must be at least 32 characters long.
  - **Generate a secure secret**: `openssl rand -base64 32`
  - **Security**: Never commit this to git. Use different secrets for each environment (development, staging, production).
  - **Required**: This variable is required for the application to start. The server will fail to start if it's missing or too short.

### Announcement Modal

The application can display a global announcement modal. The content is controlled by the following environment variables:

- `NEXT_PUBLIC_ANNOUNCEMENT_TITLE`: The title of the announcement. If this is empty, the modal will not be shown.
- `NEXT_PUBLIC_ANNOUNCEMENT_MESSAGE`: The message to be displayed in the modal. This supports markdown for formatting.
- `NEXT_PUBLIC_ANNOUNCEMENT_FORMAT`: The format of the message. Can be `markdown` (default) or `html`.

When you want to show a new announcement, update these variables. Changing `NEXT_PUBLIC_ANNOUNCEMENT_TITLE` will ensure the modal reappears for all users, even if they dismissed a previous one.

test `yarn commit`
