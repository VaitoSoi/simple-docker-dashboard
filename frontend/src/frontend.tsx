/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { Combine, ThemeProvider, WithNavigationBar, WithToast } from "./components/App";
import Containers from "./pages/Containers";
import Container from "./pages/Container";
import Images from "./pages/Images";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";

const router = createBrowserRouter([
    { path: "/", element: <Combine><Landing /></Combine> },
    { path: "/login", element: <WithToast><Login /></WithToast> },
    { path: "/containers", element: <Combine><Containers /></Combine> },
    { path: "/container/:id", element: <Combine><Container /></Combine> },
    { path: "/images", element: <Combine><Images /></Combine> },
    { path: "/settings", element: <Combine><Settings /></Combine> },
    { path: "*", element: <WithNavigationBar><NotFound /></WithNavigationBar> },
]);

const elem = document.getElementById("root")!;
const app = (
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);

if (import.meta.hot) {
    // With hot module reloading, `import.meta.hot.data` is persisted.
    const root = (import.meta.hot.data.root ??= createRoot(elem));
    root.render(app);
} else {
    // The hot module reloading API is not available in production.
    createRoot(elem).render(app);
}
