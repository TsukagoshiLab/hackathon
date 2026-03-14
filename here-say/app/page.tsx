import MainPage from './_components/MainPage';

// page.tsx は Server Component のまま保持し、
// マイク操作・状態管理が必要な部分はすべて Client Component（MainPage）に委譲する
export default function Home() {
  return <MainPage />;
}
