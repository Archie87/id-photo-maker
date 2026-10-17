import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ID Photo Maker · 本地证件照制作',
  description: '在浏览器本地处理照片，调整构图，生成证件照和打印排版。',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
