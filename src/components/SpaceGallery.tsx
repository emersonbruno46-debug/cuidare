import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Expand } from 'lucide-react';

// Fotos reais do espaço (sem pessoas). Arquivos em public/espaco.
type Photo = { src: string; label: string; alt: string; w: number; h: number };

const PHOTOS: Photo[] = [
  { src: '/background-hero.webp', label: 'Fachada', alt: 'Fachada do Espaço Cuidare em Taiobeiras', w: 1672, h: 941 },
  { src: '/espaco/recepcao.webp', label: 'Recepção', alt: 'Recepção com poltronas e o logo da Cuidare', w: 800, h: 1062 },
  { src: '/espaco/espelhos.webp', label: 'Espelhos iluminados', alt: 'Cadeiras de cabelo com espelhos iluminados', w: 800, h: 1062 },
  { src: '/espaco/salao.webp', label: 'Salão', alt: 'Salão com espelhos iluminados e área de unhas', w: 1100, h: 828 },
  { src: '/espaco/manicure-pedicure.webp', label: 'Manicure & pedicure', alt: 'Mesa de manicure e cadeira de pedicure', w: 800, h: 1062 },
  { src: '/espaco/maquiagem.webp', label: 'Maquiagem', alt: 'Bancada de maquiagem com pincéis e paletas', w: 1100, h: 828 },
  { src: '/espaco/espera.webp', label: 'Espera', alt: 'Área de espera com janelas amplas e cantinho do café', w: 800, h: 1062 },
  { src: '/espaco/unhas.webp', label: 'Unhas', alt: 'Área de unhas com esmaltes e cadeira de pedicure', w: 1100, h: 828 },
  { src: '/espaco/bancada-make.webp', label: 'Bancada de make', alt: 'Detalhe da bancada de maquiagem', w: 800, h: 1062 },
];

// Duas colunas no computador, cada uma correndo num sentido
const COL_A = [0, 2, 5, 6];
const COL_B = [1, 3, 4, 7, 8];

function Card({ index, onOpen, className = '' }: { index: number; onOpen: (i: number) => void; className?: string }) {
  const p = PHOTOS[index];
  const landscape = p.w > p.h;
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Ampliar foto: ${p.label}`}
      className={`space-card group relative block w-full overflow-hidden rounded-2xl border border-[#E6DFD5] bg-[#EFE8DD] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A15D] ${landscape ? 'aspect-[4/3]' : 'aspect-[3/4]'} ${className}`}
    >
      <img
        src={p.src}
        alt={p.alt}
        width={p.w}
        height={p.h}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#29231F]/55 via-transparent to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#FAF8F5]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#70542D] backdrop-blur-sm">
        {p.label}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF8F5]/90 text-[#29231F] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <Expand size={14} />
      </span>
    </button>
  );
}

export default function SpaceGallery() {
  const [open, setOpen] = useState<number | null>(null);

  const go = useCallback((step: number) => {
    setOpen((cur) => (cur === null ? cur : (cur + step + PHOTOS.length) % PHOTOS.length));
  }, []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go]);

  return (
    <>
      {/* Computador: duas colunas correndo em sentidos opostos */}
      <div className="space-marquee-v relative hidden h-[600px] lg:grid grid-cols-2 gap-4 overflow-hidden">
        {[COL_A, COL_B].map((col, ci) => (
          <div key={ci} className="relative">
            <div className={`space-track-v ${ci === 0 ? 'space-up' : 'space-down'}`}>
              {[...col, ...col].map((i, k) => (
                <div key={k} className="pb-4" aria-hidden={k >= col.length || undefined}>
                  <Card index={i} onOpen={setOpen} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Celular e tablet: faixa horizontal */}
      <div className="space-marquee-h relative -mx-4 overflow-hidden sm:-mx-6 lg:hidden">
        <div className="space-track-h flex w-max">
          {[...PHOTOS.keys(), ...PHOTOS.keys()].map((i, k) => (
            <div key={k} className="w-[200px] shrink-0 pr-3 sm:w-[240px]" aria-hidden={k >= PHOTOS.length || undefined}>
              <Card index={i} onOpen={setOpen} className="!aspect-[3/4]" />
            </div>
          ))}
        </div>
      </div>

      {/* Foto ampliada */}
      <AnimatePresence>
        {open !== null && (
          <motion.div
            key="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={PHOTOS[open].label}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1512]/90 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <motion.figure
              key={open}
              className="relative max-h-full max-w-5xl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={PHOTOS[open].src}
                alt={PHOTOS[open].alt}
                className="max-h-[82vh] w-auto rounded-2xl object-contain shadow-2xl"
              />
              <figcaption className="mt-3 text-center text-xs font-bold uppercase tracking-widest text-[#E6D4B8]">
                {PHOTOS[open].label} · {open + 1}/{PHOTOS.length}
              </figcaption>
            </motion.figure>

            <button type="button" aria-label="Fechar" onClick={() => setOpen(null)} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X size={20} />
            </button>
            <button type="button" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <ChevronLeft size={22} />
            </button>
            <button type="button" aria-label="Próxima foto" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <ChevronRight size={22} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
