import type { Metadata } from 'next';
import Link from 'next/link';
import { Bricolage_Grotesque } from 'next/font/google';
import { AuthCta } from './components/AuthCta';
import { RegisterForm } from './components/RegisterForm';
import { CATEGORIES } from '../lib/registration';
import s from './landing.module.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'Timely for business — more bookings, less back-and-forth',
  description:
    'Get found, get booked and stay organised. Timely gives customers one simple way to book your business, and gives you one clear place to manage it. Register your business today.',
};

// TODO: replace with the address customers should write to about getting set up.
const CONTACT_EMAIL = 'hello@timely.app';

const STEPS = [
  {
    title: 'The customer opens their booking',
    text: 'In the Timely app, an upcoming booking shows a QR pass and a reference like #BK482913.',
  },
  {
    title: 'You scan it in Check-in',
    text: 'Open Check-in on a phone, tablet or laptop and point the camera at the pass. No camera? Type the reference instead.',
  },
  {
    title: 'The booking opens, checked against today',
    text: 'You see the customer, service, staff and time. Cancelled bookings, repeat check-ins and bookings for another day are flagged before you confirm.',
  },
  {
    title: 'Tap Check in',
    text: 'The arrival time is saved on the booking. When the service is finished, mark it as completed.',
  },
];

const CONTROLS = [
  {
    name: 'Bookings',
    text: 'Upcoming, completed and cancelled appointments in one list. Mark visits done or cancel when plans change.',
  },
  {
    name: 'Services and staff',
    text: 'Set what customers can book, how long it takes and what it costs. Add the team members they can choose.',
  },
  {
    name: 'Hours and location',
    text: 'Your opening hours become the times customers can pick. Add your address and pin the spot on Google Maps.',
  },
  {
    name: 'Photo and links',
    text: 'Upload the photo customers see in the app, and add your website or social page.',
  },
  {
    name: 'Price range',
    text: 'Show customers at a glance whether you are R, RR or RRR.',
  },
];

const PERKS = [
  {
    title: 'Open around the clock.',
    text: 'Customers can book at 11pm on a Sunday. You wake up to a fuller diary, and nobody had to answer a phone.',
  },
  {
    title: 'Booked in a few taps.',
    text: 'They pick a service, a time and a team member. No calls, no back-and-forth messages, no waiting for a reply.',
  },
  {
    title: 'Every customer in one place.',
    text: 'Names, services, times and prices live in one clear list, so nothing depends on your memory or a notebook.',
  },
  {
    title: 'Arrivals in one scan.',
    text: 'When a customer walks in, scan their QR pass. No searching, no mix-ups, and the booking is marked as arrived.',
  },
  {
    title: 'Found by new customers.',
    text: 'Your photo, prices, hours and location appear in the app, right where people are already looking for a business like yours.',
  },
];

const NEXT_STEPS = [
  { title: 'You send your details', text: 'It takes about two minutes.' },
  { title: 'We get in touch', text: 'The Timely team contacts you on WhatsApp or email to confirm everything.' },
  { title: 'We create your login', text: 'You receive your email and a temporary password.' },
  { title: 'You open for bookings', text: 'Add your services, hours and photo, and customers can start booking.' },
];

const SAMPLE_BOOKINGS = [
  { initials: 'AN', name: 'Amahle Ndlovu', meta: 'Haircut & Style · 10:00 AM', price: 'R350', status: 'Upcoming' },
  { initials: 'SM', name: 'Sipho Mokoena', meta: 'Colour Treatment · 11:30 AM', price: 'R620', status: 'Upcoming' },
  { initials: 'LD', name: 'Lerato Dube', meta: 'Blow Dry · Wed, 2:00 PM', price: 'R220', status: 'Completed' },
];

/**
 * A decorative QR-style pattern (three finder squares + seeded noise). It is
 * drawn, not scannable, so the page never ships a code that points anywhere.
 */
function buildQrPath(): string {
  const size = 25;
  const grid = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const gx = ox + x;
        const gy = oy + y;
        if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue;
        reserved[gy][gx] = true;
        const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        grid[gy][gx] =
          inside && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      }
    }
  };
  finder(0, 0);
  finder(size - 7, 0);
  finder(0, size - 7);

  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  let seed = 20260918;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!reserved[y][x]) grid[y][x] = rand() > 0.52;
    }
  }

  let d = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!grid[y][x]) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < size && grid[y][x + w]) w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w;
    }
  }
  return d;
}

const QR_PATH = buildQrPath();

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className={`${s.page} ${display.variable}`}>
      {/* ------------------------------- hero ------------------------------- */}
      <header className={s.hero}>
        <span className={s.orbA} />
        <span className={s.orbB} />

        <div className={s.wrap}>
          <nav className={s.nav} aria-label="Main">
            <a href="#top" className={s.brand}>
              <span className={`${s.mark} ${s.display}`}>T</span>
              <span className={s.wordmark}>TIMELY</span>
              <span className={s.forBusiness}>for business</span>
            </a>
            <div className={s.navActions}>
              <AuthCta className={s.pill} guestLabel="Log in" />
              <a href="#register" className={`${s.pill} ${s.pillSolid}`}>
                Register your business
              </a>
            </div>
          </nav>

          <div className={s.heroGrid} id="top">
            <div>
              <h1 className={`${s.h1} ${s.display}`}>
                <span>More bookings.</span>
                <span>No back-and-forth.</span>
              </h1>
              <p className={s.lede}>
                Timely puts your business in front of customers who are ready to book. They pick a service and
                a time in the app, you get the booking, and you get on with the work you do best.
              </p>
              <div className={s.ctaRow}>
                <a href="#register" className={s.primary}>
                  Register your business
                </a>
                <AuthCta className={s.ghost} guestLabel="Log in" />
              </div>
              <p className={s.fine}>
                Takes about two minutes. Questions? Email{' '}
                <a className={s.link} href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>

            <div
              className={s.stage}
              role="img"
              aria-label="A customer's booking pass with a QR code being scanned, then marked as checked in"
            >
              <div className={s.ticketGhost} />
              <div className={s.ticket}>
                <div className={s.ticketTop}>
                  <div className={s.tHead}>
                    <span className={`${s.tAvatar} ${s.display}`}>G</span>
                    <div>
                      <p className={s.tName}>Glow Hair Studio</p>
                      <p className={s.tService}>Haircut &amp; Style</p>
                    </div>
                  </div>
                  <dl className={s.tMeta}>
                    <div>
                      <dt>Date</dt>
                      <dd>Thu, 18 Sep</dd>
                    </div>
                    <div>
                      <dt>Time</dt>
                      <dd>10:00 AM</dd>
                    </div>
                    <div>
                      <dt>Price</dt>
                      <dd>R350</dd>
                    </div>
                  </dl>
                  <span className={s.tBadge}>
                    <ClockIcon /> Upcoming
                  </span>
                </div>
                <div className={s.ticketBottom}>
                  <div className={s.qrBox}>
                    <svg className={s.qrSvg} viewBox="0 0 25 25" shapeRendering="crispEdges" aria-hidden="true">
                      <path d={QR_PATH} fill="currentColor" />
                    </svg>
                    <span className={s.scan} />
                  </div>
                  <p className={s.tHint}>Show this at check-in</p>
                  <p className={s.tRef}>#BK482913</p>
                </div>
              </div>

              <div className={s.checked}>
                <span className={s.checkedIcon}>
                  <CheckIcon />
                </span>
                <div>
                  <p className={s.checkedTitle}>Amahle is checked in</p>
                  <p className={s.checkedSub}>Thu, 18 Sep at 10:02</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ------------------------------ perks ------------------------------ */}
        <section className={s.section}>
          <div className={s.wrap}>
            <h2 className={`${s.h2} ${s.display}`}>You do the work. Timely does the booking.</h2>
            <p className={s.body}>
              Every missed call is a customer who booked someone else. Timely gives customers one simple way to
              book you, at any time of day, and gives you one clear place to see it all.
            </p>
            <ul className={s.perks}>
              {PERKS.map((p) => (
                <li className={s.perk} key={p.title}>
                  <h3 className={`${s.perkTitle} ${s.display}`}>{p.title}</h3>
                  <p className={s.perkText}>{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------- check-in ----------------------------- */}
        <section className={`${s.section} ${s.sectionLight}`} id="check-in">
          <div className={`${s.wrap} ${s.stepsGrid}`}>
            <div className={s.stickyCol}>
              <h2 className={`${s.h2} ${s.display}`}>Check-in takes one scan.</h2>
              <p className={`${s.body} ${s.bodyDark}`}>
                Every upcoming booking in the Timely app has its own QR pass. Scan it and the booking opens
                with the service, time and status, so nobody has to search a list.
              </p>
            </div>

            <ol className={s.steps}>
              {STEPS.map((step, i) => (
                <li className={s.step} key={step.title}>
                  <span className={`${s.node} ${s.display}`}>{i + 1}</span>
                  <div>
                    <h3 className={`${s.stepTitle} ${s.display}`}>{step.title}</h3>
                    <p className={s.stepText}>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --------------------------- everything else --------------------------- */}
        <section className={s.section}>
          <div className={`${s.wrap} ${s.ctrlGrid}`}>
            <div>
              <h2 className={`${s.h2} ${s.display}`}>Everything else your bookings need.</h2>
              <dl className={s.dl}>
                {CONTROLS.map((c) => (
                  <div className={s.dlRow} key={c.name}>
                    <dt className={s.display}>{c.name}</dt>
                    <dd>{c.text}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={s.desk} role="img" aria-label="Example bookings list for a business">
              <div className={s.deskHead}>
                <h3 className={`${s.deskTitle} ${s.display}`}>Bookings</h3>
                <span className={s.deskSub}>Glow Hair Studio</span>
              </div>
              <div className={s.chips}>
                <span className={`${s.chip} ${s.chipOn}`}>Upcoming</span>
                <span className={s.chip}>Completed</span>
                <span className={s.chip}>Cancelled</span>
              </div>
              {SAMPLE_BOOKINGS.map((b) => (
                <article className={s.bk} key={b.name}>
                  <span className={s.bkAv}>{b.initials}</span>
                  <div>
                    <p className={s.bkName}>{b.name}</p>
                    <p className={s.bkMeta}>{b.meta}</p>
                  </div>
                  <div className={s.bkRight}>
                    <p className={s.bkPrice}>{b.price}</p>
                    <span className={`${s.status} ${b.status === 'Completed' ? s.stDone : s.stUp}`}>{b.status}</span>
                  </div>
                </article>
              ))}
              <div className={s.deskAction}>
                <span>Amahle Ndlovu scanned in</span>
                <b>Checked in 10:02</b>
              </div>
              <p className={s.sample}>Sample data for illustration.</p>
            </div>
          </div>
        </section>

        {/* ----------------------------- register ----------------------------- */}
        <section className={`${s.section} ${s.registerSection}`} id="register">
          <div className={`${s.wrap} ${s.registerGrid}`}>
            <div>
              <h2 className={`${s.h2} ${s.display}`}>Register your business now.</h2>
              <p className={s.body}>
                Join the businesses customers can book in a few taps. Fill in the form and the Timely team will
                get in touch to set you up.
              </p>

              <ol className={`${s.steps} ${s.stepsDark}`}>
                {NEXT_STEPS.map((step, i) => (
                  <li className={s.step} key={step.title}>
                    <span className={`${s.node} ${s.display}`}>{i + 1}</span>
                    <div>
                      <h3 className={`${s.stepTitle} ${s.display}`}>{step.title}</h3>
                      <p className={s.stepText}>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className={s.catsLabel}>Made for businesses in</p>
              <ul className={s.cats} style={{ marginTop: 12 }}>
                {CATEGORIES.map((c) => (
                  <li className={s.cat} key={c}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <RegisterForm />
          </div>
        </section>
      </main>

      <div className={s.wrap}>
        <footer className={s.footer}>
          <span>© {new Date().getFullYear()} Timely</span>
          <span className={s.footerLinks}>
            <a className={s.link} href="#register">
              Register your business
            </a>
            <Link className={s.link} href="/login">
              Log in
            </Link>
            <a className={s.link} href={`mailto:${CONTACT_EMAIL}`}>
              Contact us
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
