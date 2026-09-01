import { LocalParticipant, Track } from "livekit-client";

/**
 * Toca um som do soundboard.
 *
 * Se `localParticipant` for passado (você está numa call), publica o
 * áudio como uma track extra no LiveKit com nome "soundboard" — assim
 * todo mundo na call ouve, igual ao soundboard do Discord. O
 * `SoundboardAudioRenderer` do lado de quem recebe é quem sabe
 * reconhecer essa track pelo nome e tocar ela.
 *
 * Publicar no LiveKit não faz você se ouvir de volta, então também
 * tocamos localmente ao mesmo tempo.
 *
 * Se não tiver `localParticipant` (fora de uma call), só toca localmente
 * — cobre o caso de eventualmente pré-visualizar um som antes de entrar.
 */
export async function playSoundboardSound(
  url: string,
  localParticipant?: LocalParticipant
): Promise<void> {
  if (!localParticipant) {
    const audio = new Audio(url);
    await audio.play();
    return;
  }

  const audioContext = new AudioContext();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Publica pro LiveKit — quem estiver na call ouve isso vindo de você.
  const destination = audioContext.createMediaStreamDestination();
  source.connect(destination);
  // E toca no seu próprio alto-falante também.
  source.connect(audioContext.destination);

  const [track] = destination.stream.getAudioTracks();
  const publication = await localParticipant.publishTrack(track, {
    name: "soundboard",
    source: Track.Source.Unknown,
  });

  source.start();

  source.onended = () => {
    localParticipant.unpublishTrack(publication.track ?? track);
    track.stop();
    audioContext.close();
  };
}
