export default function AuthLayout({
    children
}: {
    children: React.ReactNode;
}) {
    // Layout untuk halaman auth (login) tanpa sidebar dan header
    return <>{children}</>;
}
