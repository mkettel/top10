import Link from 'next/link';
import { Monoton } from "next/font/google";

const monoton = Monoton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-monoton",
})

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <div className="p-8 relative">
        <p className='text-2xl font-outfit text-new-blue font-semibold'>The</p>
        <h1 className={`text-new-blue text-[120px] uppercase font-extrabold ${monoton.variable} leading-36 font-fun border-b-2`}>top 10</h1>
        {/* <p className='text-2xl font-outfit absolute bottom-10 text-new'>Game</p> */}
      </div>
      <div className="flex justify-center px-6 items-center">
        <Link href="/login" className="bg-new-blue text-offwhite p-4 text-lg font-outfit text-center w-fit rounded-md">
            Play
        </Link>
      </div>
      

    </div>
  );
}