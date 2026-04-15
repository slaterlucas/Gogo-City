import { useState } from 'react';
import { createCheckIn, CheckInResponse } from '../api/checkins';
import { InstanceTask } from '../api/instances';
import { X, MapPin, Camera, Loader2, CheckCircle, XCircle, Zap } from 'lucide-react';

interface Props {
  task: InstanceTask;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckInModal({ task, onClose, onSuccess }: Props) {
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsGPS = task.verification_type === 'gps' || task.verification_type === 'both';
  const needsPhoto = task.verification_type === 'photo' || task.verification_type === 'both';

  const getGPS = () => {
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsStatus('done');
      },
      (err) => {
        setError(`GPS error: ${err.message}`);
        setGpsStatus('idle');
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canSubmit = () => {
    if (needsGPS && !coords) return false;
    if (needsPhoto && !photo) return false;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await createCheckIn({
        instance_task_id: task.id,
        user_lat: coords?.lat,
        user_lng: coords?.lng,
        accuracy_meters: coords?.accuracy,
        photo_base64: photo || undefined,
      });
      setResult(res);
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'object') {
        setError(detail.reason || 'Verification failed');
      } else {
        setError(detail || 'Check-in failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[430px] border-t-2 border-[var(--color-text)] p-5 pb-8 max-h-[80vh] overflow-y-auto" style={{ marginBottom: 0 }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--color-text-muted)]">
          <X size={20} />
        </button>

        <h2 className="text-xs uppercase tracking-widest mb-1">Check In</h2>
        <h3 className="font-sans text-sm text-[var(--color-text-muted)] mb-4">{task.name}</h3>

        {result ? (
          <div className="text-center py-6">
            <CheckCircle size={48} className="text-[var(--color-success)] mx-auto mb-3" />
            <p className="text-sm uppercase tracking-widest">Verified!</p>
            <p className="font-sans text-sm text-[var(--color-text-muted)] mt-1">{result.reason}</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-[var(--color-primary)]">
              <Zap size={20} />
              <span className="text-xl font-bold">+{result.xp_earned} XP</span>
            </div>
            <p className="text-[8px] text-[var(--color-text-muted)] mt-1 uppercase tracking-widest">
              Total: {result.total_xp} XP (Level {result.level})
            </p>
          </div>
        ) : (
          <>
            {needsGPS && (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1">
                  <MapPin size={12} /> GPS Verification
                </p>
                {coords ? (
                  <div className="card-retro p-3">
                    <p className="text-[10px] text-[var(--color-success)] uppercase tracking-widest">Location Captured</p>
                    <p className="font-sans text-[10px] text-[var(--color-text-muted)] mt-1">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (±{coords.accuracy.toFixed(0)}m)
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={getGPS}
                    disabled={gpsStatus === 'loading'}
                    className="w-full py-3 bg-white border-2 border-[var(--color-border)] text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:border-[var(--color-primary)] transition-colors"
                  >
                    {gpsStatus === 'loading' ? (
                      <><Loader2 size={16} className="animate-spin" /> Getting location...</>
                    ) : (
                      <><MapPin size={16} /> Get My Location</>
                    )}
                  </button>
                )}
              </div>
            )}

            {needsPhoto && (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Camera size={12} /> Photo Verification
                </p>
                {task.verification_hint && (
                  <p className="font-sans text-xs text-[var(--color-primary)] mb-2 italic">{task.verification_hint}</p>
                )}
                {photo ? (
                  <div className="relative">
                    <img src={photo} alt="Captured" className="w-full h-48 object-cover border-2 border-[var(--color-border)]" />
                    <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-black/50 p-1">
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full py-8 bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] text-center cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                    <Camera size={24} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
                    <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-widest">Tap to take photo</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {error && (
              <div className="mb-4 card-retro border-[var(--color-error)] p-3 flex items-start gap-2">
                <XCircle size={16} className="text-[var(--color-error)] shrink-0 mt-0.5" />
                <p className="font-sans text-sm text-[var(--color-error)]">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || submitting}
              className="w-full py-3 bg-[var(--color-primary)] text-white text-xs uppercase tracking-widest btn-retro flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Verifying...</>
              ) : (
                'Submit Check-In'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
