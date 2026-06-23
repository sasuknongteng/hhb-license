import "./globals.css";

export const metadata = {
  title: "ระบบ อภ.1 - เทศบาลตำบลหนองเต็ง",
  description: "ตรวจสอบสถานะใบอนุญาตกิจการที่เป็นอันตรายต่อสุขภาพ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" />
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" async></script>
      </head>
      <body>{children}</body>
    </html>
  );
}