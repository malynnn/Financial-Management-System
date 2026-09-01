import { redirect } from 'next/navigation';

export default function Home() {
  // Automatically route anyone visiting the base URL to the login page.
  // The middleware.ts we built earlier will intercept this and route 
  // them to /member or /treasurer if they are already logged in!
  redirect('/login');
}