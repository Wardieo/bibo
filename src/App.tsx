import { VideoRoom } from "./components/video/VideoRoom";
import { TextRoom } from "./components/chat/TextRoom";
import { ModeHome } from "./components/home/ModeHome";
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const goTo = (nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  if (path === "/video")
    return (
      <VideoRoom
        onLeave={() => {
          goTo("/");
        }}
      />
    );
  if (path === "/text") return <TextRoom onLeave={() => goTo("/")} />;
  return (
    <ModeHome
      onChoose={(mode) => goTo(mode === "video" ? "/video" : "/text")}
    />
  );
}

export default App;
