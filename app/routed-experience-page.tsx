import { Suspense } from "react";
import { WonderDriveExperience } from "./wonderdrive-experience";

export default function RoutedExperiencePage() {
  return (
    <Suspense fallback={<RoutedExperienceFallback />}>
      <WonderDriveExperience />
    </Suspense>
  );
}

function RoutedExperienceFallback() {
  return (
    <main className="app-shell text-medium">
      <header className="app-header">
        <div className="wordmark">
          <span className="wordmark-mark" aria-hidden="true">W</span>
          <span>WonderDrive<small>curiosity, performed</small></span>
        </div>
      </header>
      <section className="loading-stage" aria-live="polite">
        <span className="loading-orbit" />
        <p>Opening your WonderDrive library…</p>
        <small>Resolving a durable guest identity</small>
      </section>
      <footer className="app-footer">
        <p><span aria-hidden="true">W/V3</span> One performer. One researched turn. Exactly two ways forward.</p>
      </footer>
    </main>
  );
}
