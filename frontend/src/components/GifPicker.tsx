import { GifPicker as ReactGifPicker, Theme } from "gif-picker-react";
import { Klipy } from "gif-picker-react/providers/klipy";
import type { Gif } from "gif-picker-react";

interface Props {
  onClose: () => void;
  onSelect: (gif: { url: string; width: number; height: number }) => void;
}

// Chave da Klipy é feita pra viver no código do frontend mesmo (não é um
// segredo tipo senha de banco — é um app key ligado ao app, plano
// grátis com anúncio opcional). Ver frontend/.env.example.
const KLIPY_API_KEY = import.meta.env.VITE_KLIPY_API_KEY as string | undefined;

/**
 * Seletor de GIF (busca + "em alta"), usando a lib `gif-picker-react` com
 * o provider Klipy — sucessora do Tenor, que a Google desligou de vez em
 * 30/06/2026 (a busca "Buscar KLIPY" no rótulo é exigência de atribuição
 * da própria Klipy, não é escolha nossa — é a mesma coisa que o Discord
 * mostra hoje, já que eles também migraram do Tenor pra Klipy).
 */
export default function GifPicker({ onClose, onSelect }: Props) {
  if (!KLIPY_API_KEY) {
    return (
      <div className="gif-picker-backdrop" onClick={onClose}>
        <div className="gif-picker-missing-key" onClick={(e) => e.stopPropagation()}>
          <p className="soundboard-error">
            Busca de GIF não configurada — falta <code>VITE_KLIPY_API_KEY</code> no{" "}
            <code>frontend/.env</code> (ver <code>.env.example</code>).
          </p>
        </div>
      </div>
    );
  }

  function handleGifClick(gif: Gif) {
    onSelect({ url: gif.imageUrl, width: gif.width, height: gif.height });
  }

  return (
    <div className="gif-picker-backdrop" onClick={onClose}>
      <div className="gif-picker-anchor" onClick={(e) => e.stopPropagation()}>
        <ReactGifPicker
          provider={Klipy(KLIPY_API_KEY)}
          onGifClick={handleGifClick}
          theme={Theme.DARK}
          width={380}
          height={420}
        />
      </div>
    </div>
  );
}
