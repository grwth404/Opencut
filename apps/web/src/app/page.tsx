import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { getWaitlistCount } from "@/lib/waitlist";

export default async function Home() {
  const signupCount = await getWaitlistCount();

  return (
    <div>
      <Header />
      <Hero signupCount={signupCount} />
    </div>
  );
}
