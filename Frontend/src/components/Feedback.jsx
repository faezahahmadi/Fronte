export default function Feedback({ error, message }) {
  return (
    <>
      {error && (
        <div className="notice-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="notice-success" role="status">
          {message}
        </div>
      )}
    </>
  );
}
