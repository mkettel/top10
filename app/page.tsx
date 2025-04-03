import Link from 'next/link';
import { Monoton } from "next/font/google";

const monoton = Monoton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-monoton",
})

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-offwhite items-center justify-center">
      <div className="flex flex-col justify-center mb-12 items-center gap-6">
        <h1 className='flex flex-col sm:flex-row text-new-blue gap-2 font-outfit text-6xl'><span></span><span>Top 10:</span><span>The Game</span></h1>
        <Link href="/login" className='flex w-fit items-center gap-2 text-2xl font-outfit text-offwhite bg-new-blue px-4 py-2 rounded-md'>
          Play Now
        </Link>
      </div>
      
    </div>
  );
}