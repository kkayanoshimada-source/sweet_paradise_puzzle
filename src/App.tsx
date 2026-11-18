import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, CakeSlice, Coins, Crown, Home, RefreshCw,
  ShoppingBag, Sparkles, Star, Trophy, X
} from "lucide-react";

type Page = "home" | "stage" | "game" | "shop" | "collection";
type SweetKind = "macaron" | "cake" | "donut" | "tart" | "choux" | "chocolate";
type Tile = { id: number; kind: SweetKind };
type Pos = { row: number; col: number };

const SWEETS: { kind: SweetKind; emoji: string; name: string; color: string }[] = [
  { kind: "macaron", emoji: "🍬", name: "マカロン", color: "#f8dce3" },
  { kind: "cake", emoji: "🍰", name: "ショートケーキ", color: "#f5e1d2" },
  { kind: "donut", emoji: "🍩", name: "ドーナツ", color: "#ead9c7" },
  { kind: "tart", emoji: "🥧", name: "フルーツタルト", color: "#f7e8b9" },
  { kind: "choux", emoji: "🧁", name: "シュークリーム", color: "#e8d9ee" },
  { kind: "chocolate", emoji: "🍫", name: "ショコラ", color: "#dfc4b3" }
];

const sweetFor = (kind: SweetKind) => SWEETS.find((s) => s.kind === kind)!;
const randomTile = (): Tile => ({
  id: Math.floor(Math.random() * 1_000_000_000),
  kind: SWEETS[Math.floor(Math.random() * SWEETS.length)].kind
});

function makeBoard(): Tile[][] {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, randomTile));
}

function findMatches(board: Tile[][]): Pos[] {
  const found = new Map<string, Pos>();
  for (let r = 0; r < 8; r++) {
    let start = 0;
    for (let c = 1; c <= 8; c++) {
      if (c < 8 && board[r][c].kind === board[r][start].kind) continue;
      if (c - start >= 3) {
        for (let k = start; k < c; k++) found.set(`${r}-${k}`, { row: r, col: k });
      }
      start = c;
    }
  }
  for (let c = 0; c < 8; c++) {
    let start = 0;
    for (let r = 1; r <= 8; r++) {
      if (r < 8 && board[r][c].kind === board[start][c].kind) continue;
      if (r - start >= 3) {
        for (let k = start; k < r; k++) found.set(`${k}-${c}`, { row: k, col: c });
      }
      start = r;
    }
  }
  return [...found.values()];
}

function settle(board: Tile[][]): { board: Tile[][]; cleared: number } {
  let next = board.map((row) => [...row]);
  let total = 0;
  for (let loop = 0; loop < 12; loop++) {
    const matches = findMatches(next);
    if (!matches.length) break;
    total += matches.length;
    const keys = new Set(matches.map((p) => `${p.row}-${p.col}`));
    next = next.map((row, r) => row.map((tile, c) => keys.has(`${r}-${c}`) ? null as unknown as Tile : tile));
    for (let c = 0; c < 8; c++) {
      const remaining: Tile[] = [];
      for (let r = 7; r >= 0; r--) if (next[r][c]) remaining.push(next[r][c]);
      for (let r = 7; r >= 0; r--) next[r][c] = remaining[7-r] ?? randomTile();
    }
  }
  return { board: next, cleared: total };
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [coins, setCoins] = useState(() => Number(localStorage.getItem("sp-coins") || 350));
  const [best, setBest] = useState(() => Number(localStorage.getItem("sp-best") || 0));
  const [unlocked, setUnlocked] = useState(() => Number(localStorage.getItem("sp-stage") || 1));
  const [board, setBoard] = useState<Tile[][]>(() => makeBoard());
  const [selected, setSelected] = useState<Pos | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(25);
  const [notice, setNotice] = useState("");
  const [owned, setOwned] = useState<string[]>(() => JSON.parse(localStorage.getItem("sp-owned") || '["classic"]'));
  const [theme, setTheme] = useState("classic");

  useEffect(() => { localStorage.setItem("sp-coins", String(coins)); }, [coins]);
  useEffect(() => { localStorage.setItem("sp-best", String(best)); }, [best]);
  useEffect(() => { localStorage.setItem("sp-stage", String(unlocked)); }, [unlocked]);
  useEffect(() => { localStorage.setItem("sp-owned", JSON.stringify(owned)); }, [owned]);

  const stageGoal = 2500 + (unlocked - 1) * 500;
  const progress = Math.min(100, (score / stageGoal) * 100);
  const pageTitle = useMemo(() => ({
    home: "HOME",
    stage: "STAGE",
    game: `STAGE ${unlocked.toString().padStart(2, "0")}`,
    shop: "SHOP",
    collection: "SWEET COLLECTION"
  }[page]), [page, unlocked]);

  function startGame() {
    setBoard(makeBoard());
    setSelected(null);
    setScore(0);
    setMoves(25);
    setPage("game");
    setNotice("");
  }

  function finishIfReady(nextScore: number, nextMoves: number) {
    if (nextScore >= stageGoal) {
      setCoins((v) => v + 120 + unlocked * 10);
      setUnlocked((v) => Math.max(v, unlocked + 1));
      setBest((v) => Math.max(v, nextScore));
      setNotice("ステージクリア！ ボーナスコインを獲得しました。");
    } else if (nextMoves <= 0) {
      setNotice("ゲーム終了。もう一度チャレンジしてみましょう。");
    }
  }

  function chooseTile(row: number, col: number) {
    if (moves <= 0 || score >= stageGoal) return;
    const here = { row, col };
    if (!selected) { setSelected(here); return; }
    const distance = Math.abs(selected.row-row) + Math.abs(selected.col-col);
    if (distance !== 1) { setSelected(here); return; }

    const swapped = board.map((line) => [...line]);
    [swapped[row][col], swapped[selected.row][selected.col]] =
      [swapped[selected.row][selected.col], swapped[row][col]];
    if (!findMatches(swapped).length) {
      setSelected(null);
      setNotice("同じお菓子が3つ並ぶように動かしてみましょう。");
      return;
    }
    const result = settle(swapped);
    const earned = result.cleared * 60;
    const nextScore = score + earned;
    const nextMoves = moves - 1;
    setBoard(result.board);
    setScore(nextScore);
    setMoves(nextMoves);
    setSelected(null);
    setNotice(result.cleared >= 5 ? "素敵なコンボ！" : "");
    finishIfReady(nextScore, nextMoves);
  }

  function buyItem(id: string, price: number) {
    if (owned.includes(id)) { setTheme(id); setNotice("このデザインを適用しました。"); return; }
    if (coins < price) { setNotice("コインが足りません。パズルで集めましょう。"); return; }
    setCoins((v) => v - price);
    setOwned((v) => [...v, id]);
    setTheme(id);
    setNotice("新しいアイテムを購入しました！");
  }

  const navItems: { id: Page; label: string; icon: typeof Home }[] = [
    { id: "home", label: "ホーム", icon: Home },
    { id: "stage", label: "ステージ", icon: Crown },
    { id: "shop", label: "お店", icon: ShoppingBag },
    { id: "collection", label: "図鑑", icon: BookOpen }
  ];

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")} aria-label="ホームへ">
          <span className="brand-mark">S</span>
          <span><b>SWEET PARADISE PUZZLE</b><small>THE WORLD OF PATISSERIE</small></span>
        </button>
        <div className="wallet"><Coins size={17} /><span>{coins.toLocaleString()}</span><small>COINS</small></div>
      </header>

      <main className="main-content">
        <div className="page-heading">
          <div><p className="eyebrow">A LITTLE MOMENT OF SWEETNESS</p><h1>{pageTitle}</h1></div>
          {page === "game" && <div className="stage-chip"><Star size={14} /> CHALLENGE</div>}
        </div>

        {page === "home" && (
          <section className="home-layout">
            <div className="hero-card">
              <div className="hero-copy">
                <h2>パティスリー物語</h2>
                <p>同じお菓子を3つ以上揃えるとコインを獲得！</p>
                <button className="gold-button" onClick={() => setPage("stage")}>ゲームをはじめる <span>→</span></button>
              </div>
              <div className="hero-art" aria-label="ケーキとマカロンのイラスト">
                <div className="halo" />
                <div className="hero-cake">🍰</div><div className="hero-macaron">🍬</div><div className="hero-flower">✦</div>
              </div>
            </div>
            <div className="dashboard-grid">
              <article className="stat-card"><span className="stat-icon"><Trophy /></span><small>BEST SCORE</small><strong>{best.toLocaleString()}</strong><em>これまでの最高スコア</em></article>
              <article className="stat-card"><span className="stat-icon"><Crown /></span><small>UNLOCKED STAGE</small><strong>{unlocked}<i> / 30</i></strong><em>次のステージに挑戦</em></article>
            </div>
            <div className="section-title"><div><span>YOUR JOURNEY</span><h3>MENU</h3></div></div>
            <div className="menu-grid">
              <button className="menu-card" onClick={() => setPage("stage")}><span>🧩</span><b>パズルに挑戦</b><small>お菓子をそろえてコインを獲得</small><i>→</i></button>
              <button className="menu-card" onClick={() => setPage("shop")}><span>🏛️</span><b>お店を飾る</b><small>家具や内装をカスタマイズ</small><i>→</i></button>
              <button className="menu-card" onClick={() => setPage("collection")}><span>📖</span><b>お菓子図鑑</b><small>出会ったスイーツをコレクション</small><i>→</i></button>
            </div>
          </section>
        )}

        {page === "stage" && (
          <section className="panel">
            <div className="panel-intro"><span className="round-icon">👑</span><div><h2>パティシエへの道</h2><p>ステージをクリアして、新しいお菓子の世界へ。</p></div></div>
            <div className="stage-grid">
              {Array.from({ length: 12 }, (_, i) => {
                const n = i + 1; const locked = n > unlocked;
                return <button key={n} disabled={locked} className={`stage-card ${locked ? "locked" : ""} ${n === unlocked ? "current" : ""}`} onClick={() => { if (!locked) { setUnlocked(n); startGame(); } }}>
                  <span>{locked ? "🔒" : n < unlocked ? "★" : "✧"}</span><b>STAGE {String(n).padStart(2,"0")}</b><small>{locked ? "COMING SOON" : n < unlocked ? "CLEARED" : "PLAY NOW"}</small>
                </button>;
              })}
            </div>
          </section>
        )}

        {page === "game" && (
          <section className="game-layout">
            <div className="game-info panel">
              <div className="goal-block"><small>MISSION</small><b>スコア {stageGoal.toLocaleString()} 点を目指そう</b><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><small>{score.toLocaleString()} / {stageGoal.toLocaleString()}</small></div>
              <div className="game-metrics"><div><small>SCORE</small><b>{score.toLocaleString()}</b></div><div><small>REMAINING</small><b>{moves}<i> MOVES</i></b></div></div>
            </div>
            <div className="board-frame">
              <div className="board-topline"><span>✦ PATISSERIE PUZZLE ✦</span><span>8 × 8</span></div>
              <div className="puzzle-board" role="grid" aria-label="お菓子パズル">
                {board.map((line, r) => line.map((tile, c) => {
                  const sweet = sweetFor(tile.kind);
                  const isSelected = selected?.row === r && selected?.col === c;
                  return <button key={tile.id} role="gridcell" aria-label={sweet.name} className={`sweet-tile ${isSelected ? "selected" : ""}`} style={{ background: sweet.color }} onClick={() => chooseTile(r,c)}>{sweet.emoji}</button>;
                }))}
              </div>
              <div className="board-hint">隣り合うお菓子をタップして入れ替えましょう</div>
            </div>
            {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="閉じる"><X size={15}/></button></div>}
            {(score >= stageGoal || moves <= 0) && <div className="result-panel"><span>{score >= stageGoal ? "🏆" : "🍰"}</span><h2>{score >= stageGoal ? "STAGE CLEAR!" : "もう一度チャレンジ"}</h2><p>{score >= stageGoal ? "おめでとうございます。次のステージが解放されました。" : "あと少し！もう一度挑戦してみましょう。"}</p><button className="gold-button" onClick={startGame}>もう一度プレイ</button><button className="text-button" onClick={() => setPage("home")}>ホームへ戻る</button></div>}
            <button className="subtle-button" onClick={() => setPage("stage")}>ステージ選択へ戻る</button>
          </section>
        )}

        {page === "shop" && (
          <section className="panel">
            <div className="panel-intro"><span className="round-icon">🏛️</span><div><h2>カラーを変更</h2><p>お気に入りの空間を選んで、お店を彩りましょう。</p></div></div>
            <div className="shop-grid">
              {[{id:"classic",name:"クラシック・アイボリー",price:0,desc:"上品で落ち着いた定番の装い",emoji:"🤍"},{id:"rose",name:"ローズ・パティスリー",price:180,desc:"やさしいローズピンクの空間",emoji:"🌹"},{id:"noir",name:"ショコラ・ノワール",price:260,desc:"深みのある大人のショコラカラー",emoji:"🍫"}].map(item => <article className="shop-item" key={item.id}><div className={`shop-swatch swatch-${item.id}`}>{item.emoji}</div><div className="shop-item-copy"><b>{item.name}</b><small>{item.desc}</small><button className="small-gold-button" onClick={() => buyItem(item.id,item.price)}>{owned.includes(item.id) ? (theme === item.id ? "適用中" : "適用する") : `${item.price} COINS`}</button></div></article>)}
            </div>
          </section>
        )}

        {page === "collection" && (
          <section className="panel">
            <div className="panel-intro"><span className="round-icon">📖</span><div><h2>コレクション</h2><p>パズルに登場するスイーツたち。お気に入りを見つけて。</p></div></div>
            <div className="collection-grid">{SWEETS.map((sweet,i) => <article className="collection-item" key={sweet.kind}><div style={{background:sweet.color}}>{sweet.emoji}</div><b>{sweet.name}</b><small>{i < 3 ? "DISCOVERED" : "IN YOUR DREAMS"}</small></article>)}</div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="メインメニュー">
        {navItems.map(({id,label,icon:Icon}) => <button key={id} className={page === id || (id === "stage" && page === "game") ? "active" : ""} onClick={() => setPage(id)}><Icon size={19}/><span>{label}</span></button>)}
      </nav>
      <footer className="site-footer">SWEET PARADISE <span>·</span> MADE WITH A LITTLE MAGIC</footer>
    </div>
  );
}
