import { Suspense } from "react";
import AuthSlider from "../components/AuthSlider";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthSlider initialMode="signup" />
    </Suspense>
  );
}