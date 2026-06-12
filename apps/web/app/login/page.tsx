import { Suspense } from "react";
import AuthSlider from "../components/AuthSlider";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthSlider initialMode="login" />
    </Suspense>
  );
}