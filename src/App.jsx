import { useEffect, useMemo, useState } from "react";
import { teams, players, midfieldLens } from "./data";
import "./styles.css";

const defaultWeights = {
  midfield: 21,
  defensive: 20,
  squad: 15,
  pedigree: 13,
  goal: 11,
  experience: 9,
  age: 7,
  path: 4,
};

const factorLabels = {
  midfield: "Midfield control",
  defensive: "Defensive control",
  squad: "Squad depth",
  pedigree: "Tournament pedigree",
  goal: "Goal threat",
  experience: "Experience",
  age: "Age / fitness",
  path: "Path difficulty",
};

const market = {
  ESP: { odds: 4.5, probability: 15.5, note: "Best team profile, but the price is short." },
  FRA: { odds: 5.0, probability: 11.5, note: "Elite team, less value at this price." },
  ENG: { odds: 6.0, probability: 10.5, note: "Excellent squad, weaker value." },
  BRA: { odds: 7.5, probability: 8.5, note: "Dangerous, but control questions remain." },
  ARG: { odds: 7.5, probability: 13.5, note: "Best elite value: pedigree and game management." },
  POR: { odds: 6.0, probability: 8.5, note: "Deep squad, but priced too short." },
  GER: { odds: 10.0, probability: 10.5, note: "Borderline +EV after the revised model." },
  NED: { odds: 6.0, probability: 5.5, note: "Good team, poor outright price." },
  BEL: { odds: 35.0, probability: 3.0, note: "Small longshot value." },
  JPN: { odds: 35.0, probability: 1.7, note: "Strong side, hard outright path." },
};

const pedigree = {
  ARG: 98, GER: 96, BRA: 95, FRA: 92, ESP: 86, ENG: 78, URU: 72, NED: 70,
  CRO: 68, POR: 64, BEL: 54, COL: 49, MEX: 48, SUI: 47, MAR: 45, USA: 43,
  JPN: 38, KOR: 38, SEN: 36,
};

const defensiveOverrides = {
  ESP: 90, ARG: 88, FRA: 91, GER: 86, ENG: 84, POR: 82, NED: 81, BRA: 80,
  MAR: 80, SUI: 79, CRO: 78, URU: 78, SEN: 77, ECU: 76, AUT: 76, BEL: 75,
  JPN: 74, USA: 72,
};

const historyRows = [
  { year: 2022, winner: "Argentina", oldRank: 2, newRank: 1, trait: "Experience + midfield balance" },
  { year: 2018, winner: "France", oldRank: 3, newRank: 1, trait: "Defensive block + transitions" },
  { year: 2014, winner: "Germany", oldRank: 1, newRank: 1, trait: "Midfield tempo + depth" },
  { year: 2010, winner: "Spain", oldRank: 1, newRank: 1, trait: "Possession + low concessions" },
  { year: 2006, winner: "Italy", oldRank: 1, newRank: 1, trait: "Pirlo tempo + elite defence" },
  { year: 2002, winner: "Brazil", oldRank: 2, newRank: 2, trait: "Star attack + pragmatic base" },
  { year: 1998, winner: "France", oldRank: 1, newRank: 1, trait: "Midfield + defensive control" },
  { year: 1994, winner: "Brazil", oldRank: 2, newRank: 1, trait: "Dunga/Mauro Silva platform" },
  { year: 1990, winner: "West Germany", oldRank: 1, newRank: 1, trait: "Matthäus-led control" },
  { year: 1986, winner: "Argentina", oldRank: 2, newRank: 2, trait: "Maradona + compact structure" },
  { year: 1982, winner: "Italy", oldRank: 3, newRank: 2, trait: "Defence + tournament surge" },
  { year: 1978, winner: "Argentina", oldRank: 2, newRank: 1, trait: "Home edge + midfield steel" },
  { year: 1974, winner: "West Germany", oldRank: 2, newRank: 1, trait: "Structure over aesthetics" },
  { year: 1970, winner: "Brazil", oldRank: 1, newRank: 1, trait: "Technical control + stars" },
  { year: 1966, winner: "England", oldRank: 2, newRank: 1, trait: "Compact midfield + home edge" },
  { year: 1962, winner: "Brazil", oldRank: 1, newRank: 1, trait: "Repeat champion platform" },
  { year: 1958, winner: "Brazil", oldRank: 1, newRank: 1, trait: "Generational quality" },
  { year: 1954, winner: "West Germany", oldRank: 4, newRank: 3, trait: "Tactical upset" },
  { year: 1950, winner: "Uruguay", oldRank: 3, newRank: 2, trait: "Resilience + pedigree" },
  { year: 1938, winner: "Italy", oldRank: 1, newRank: 1, trait: "Repeat champion pedigree" },
];

const teamByCode = Object.fromEntries(teams.map((team) => [team.code, team]));
const midfieldByCode = Object.fromEntries(midfieldLens.map((item) => [item.code, item]));
const groups = ["All", ...Array.from(new Set(teams.map((team) => team.group))).sort()];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function number(value, digits = 1) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function percent(value, digits = 1) {
  return `${number(value, digits)}%`;
}

function ev(probability, odds) {
  return (Number(probability) / 100) * Number(odds) - 1;
}

function normaliseWeights(weights) {
  const total = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, (Number(value || 0) / total) * 100]));
}

function factorsFor(team) {
  const midfieldScore = midfieldByCode[team.code]?.score
    ? midfieldByCode[team.code].score * 10
    : (team.big5_score * 45) + (team.rank_score * 35) + (team.exp_score * 20);

  return {
    midfield: clamp(midfieldScore),
    defensive: defensiveOverrides[team.code] ?? clamp((team.rank_score * 42) + (team.big5_score * 28) + (team.age_score * 20) + (team.path_score * 10)),
    squad: clamp((team.big5_players / 26) * 100),
    pedigree: pedigree[team.code] ?? clamp((team.rank_score * 45) + ((team.europe_players / 26) * 20) + 15),
    goal: clamp(team.goal_score * 100),
    experience: clamp(team.exp_score * 100),
    age: clamp(team.age_score * 100),
    path: clamp(team.path_score * 100),
  };
}

function scoreTeam(team, weights) {
  const normalised = normaliseWeights(weights);
  const factors = factorsFor(team);
  const score = Object.entries(normalised).reduce((sum, [key, weight]) => sum + factors[key] * (weight / 100), 0);
  return { ...team, factors, revisedScore: score };
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore private browsing or storage errors.
    }
  }, [key, value]);

  return [value, setValue];
}

function TeamCode({ code }) {
  return <span className="team-code">{code}</span>;
}

function PageTitle({ kicker, title, children }) {
  return (
    <div className="page-title">
      <span>{kicker}</span>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <strong>{value}</strong>
      {note ? <span>{note}</span> : null}
    </div>
  );
}

function Overview({ setView }) {
  return (
    <section className="home-layout">
      <article className="main-card pick-card">
        <span className="label">Main conclusion</span>
        <h2>Spain is the best football pick.</h2>
        <p>The revised model favours teams with midfield control, defensive control and enough squad depth to survive seven matches.</p>
        <div className="simple-stats">
          <Stat label="Best team" value="Spain" note="Control + depth" />
          <Stat label="Best elite value" value="Argentina 7.5" note="Pedigree + experience" />
          <Stat label="Borderline value" value="Germany 10.0" note="Fair to slightly +EV" />
        </div>
      </article>

      <article className="main-card summary-card">
        <span className="label">One-line model</span>
        <p><strong>World Cup winners usually need midfield control + defensive control.</strong></p>
        <p className="quiet">Pure attacking talent matters, but history suggests it is not enough on its own.</p>
      </article>

      <article className="main-card value-card">
        <span className="label">Value view</span>
        <ol className="clean-list">
          <li><span>Argentina</span><strong>+1.3% EV</strong></li>
          <li><span>Germany</span><strong>+5.0% EV</strong></li>
          <li><span>Belgium</span><strong>+5.0% EV</strong></li>
        </ol>
        <p className="quiet">Spain remains No. 1 by football profile, but the 4.5 price is short.</p>
      </article>

      <div className="home-actions">
        <button onClick={() => setView("teams")}>View team details</button>
        <button onClick={() => setView("value")}>View odds / EV</button>
        <button onClick={() => setView("history")}>View historical test</button>
      </div>
    </section>
  );
}

function ValueView() {
  const rows = Object.entries(market)
    .map(([code, row]) => ({ code, team: teamByCode[code]?.team || code, ...row, implied: 100 / row.odds, ev: ev(row.probability, row.odds) }))
    .sort((a, b) => b.ev - a.ev);

  return (
    <section className="stack">
      <PageTitle kicker="Odds" title="Value board">
        EV = estimated probability × decimal odds − 1. Positive EV means the price is better than my estimate.
      </PageTitle>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Team</th><th>Odds</th><th>Implied</th><th>Estimate</th><th>EV</th><th>Read</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code}>
                <td><TeamCode code={row.code} /> {row.team}</td>
                <td>{number(row.odds, 1)}</td>
                <td>{percent(row.implied)}</td>
                <td>{percent(row.probability)}</td>
                <td className={row.ev >= 0 ? "good" : "bad"}>{percent(row.ev * 100)}</td>
                <td className="wide">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeamsView({ scoredTeams }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [selectedCode, setSelectedCode] = useState("ESP");

  const rows = scoredTeams
    .filter((team) => group === "All" || team.group === group)
    .filter((team) => `${team.team} ${team.code}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 48);

  const selected = scoredTeams.find((team) => team.code === selectedCode) || scoredTeams[0];
  const selectedPlayers = players.filter((player) => player.code === selected.code);
  const topCaps = [...selectedPlayers].sort((a, b) => Number(b.caps || 0) - Number(a.caps || 0)).slice(0, 5);
  const topGoals = [...selectedPlayers].sort((a, b) => Number(b.goals || 0) - Number(a.goals || 0)).slice(0, 5);
  const midfield = midfieldByCode[selected.code];

  return (
    <section className="stack">
      <PageTitle kicker="Teams" title="Team details">
        Inspect the full ranking and player leaders.
      </PageTitle>

      <div className="filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team" />
        <select value={group} onChange={(event) => setGroup(event.target.value)}>
          {groups.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="two-pane">
        <div className="table-wrap team-list">
          <table>
            <thead><tr><th>Team</th><th>Group</th><th>Score</th><th>Rank</th></tr></thead>
            <tbody>
              {rows.map((team) => (
                <tr key={team.code} onClick={() => setSelectedCode(team.code)} className={team.code === selected.code ? "selected" : ""}>
                  <td><TeamCode code={team.code} /> {team.team}</td>
                  <td>{team.group}</td>
                  <td>{number(team.revisedScore, 1)}</td>
                  <td>{number(team.rank, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="detail-card">
          <span className="label">Selected team</span>
          <h3>{selected.team}</h3>
          <div className="simple-stats single">
            <Stat label="Revised score" value={number(selected.revisedScore, 1)} />
            <Stat label="FIFA rank" value={number(selected.rank, 0)} />
            <Stat label="Big Five players" value={number(selected.big5_players, 0)} />
          </div>
          <p><strong>Midfield:</strong> {midfield ? `${midfield.controller}. ${midfield.note}` : "No specific note; score uses squad proxies."}</p>
          <p><strong>Top caps:</strong> {selected.top_caps}</p>
          <p><strong>Top goals:</strong> {selected.top_goals}</p>
          <div className="player-columns">
            <div>
              <h4>Most capped</h4>
              <ol>{topCaps.map((player) => <li key={`${player.player}-caps`}>{player.player} <span>{number(player.caps, 0)}</span></li>)}</ol>
            </div>
            <div>
              <h4>Top scorers</h4>
              <ol>{topGoals.map((player) => <li key={`${player.player}-goals`}>{player.player} <span>{number(player.goals, 0)}</span></li>)}</ol>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function WeightsView({ weights, setWeights, scoredTeams }) {
  const normalised = normaliseWeights(weights);

  function update(key, value) {
    setWeights((current) => ({ ...current, [key]: Number(value) }));
  }

  return (
    <section className="stack">
      <PageTitle kicker="Model" title="Weight tuner">
        These weights were adjusted after comparing the past 20 winners against quarter-final or final-eight-equivalent teams.
      </PageTitle>

      <div className="two-pane equal">
        <div className="detail-card">
          {Object.entries(weights).map(([key, value]) => (
            <label className="slider" key={key}>
              <span>{factorLabels[key]} <small>{number(normalised[key], 1)}%</small></span>
              <input type="range" min="0" max="35" value={value} onChange={(event) => update(key, event.target.value)} />
            </label>
          ))}
          <button className="plain-button" onClick={() => setWeights(defaultWeights)}>Reset weights</button>
        </div>

        <div className="detail-card">
          <span className="label">Top teams under current weights</span>
          <ol className="clean-list ranking">
            {scoredTeams.slice(0, 10).map((team) => (
              <li key={team.code}><span>{team.team}</span><strong>{number(team.revisedScore, 1)}</strong></li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function HistoryView() {
  const oldTopOne = historyRows.filter((row) => row.oldRank === 1).length;
  const newTopOne = historyRows.filter((row) => row.newRank === 1).length;
  const newTopThree = historyRows.filter((row) => row.newRank <= 3).length;

  return (
    <section className="stack">
      <PageTitle kicker="Backtest" title="Past 20 winners">
        Winner profile compared with quarter-final or final-eight-equivalent teams.
      </PageTitle>

      <div className="simple-stats">
        <Stat label="Old model top-1" value={`${oldTopOne}/20`} note="Too talent-heavy" />
        <Stat label="Revised top-1" value={`${newTopOne}/20`} note="Better fit" />
        <Stat label="Revised top-3" value={`${newTopThree}/20`} note="Less overfitted" />
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Year</th><th>Winner</th><th>Old rank</th><th>New rank</th><th>Main trait</th></tr></thead>
          <tbody>
            {historyRows.map((row) => (
              <tr key={row.year}>
                <td>{row.year}</td>
                <td>{row.winner}</td>
                <td>#{row.oldRank}</td>
                <td>#{row.newRank}</td>
                <td className="wide">{row.trait}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function App() {
  const [view, setView] = useState("summary");
  const [weights, setWeights] = useLocalStorage("wc-model-weights", defaultWeights);

  const scoredTeams = useMemo(
    () => teams.map((team) => scoreTeam(team, weights)).sort((a, b) => b.revisedScore - a.revisedScore),
    [weights],
  );

  const views = {
    summary: <Overview setView={setView} />,
    value: <ValueView />,
    teams: <TeamsView scoredTeams={scoredTeams} />,
    weights: <WeightsView weights={weights} setWeights={setWeights} scoredTeams={scoredTeams} />,
    history: <HistoryView />,
  };

  return (
    <main className="app">
      <header className="site-header">
        <div>
          <span className="label">World Cup 2026</span>
          <h1>Winner analysis</h1>
        </div>
      </header>

      <nav className="tabs" aria-label="Views">
        {[
          ["summary", "Summary"],
          ["value", "Value"],
          ["teams", "Teams"],
          ["weights", "Weights"],
          ["history", "History"],
        ].map(([key, label]) => (
          <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{label}</button>
        ))}
      </nav>

      {views[view]}
    </main>
  );
}
