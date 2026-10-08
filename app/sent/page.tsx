import SentList from './sent-list';

export default function SentPage() {
  return (
    <>
      <section className="hero">
        <h1>Sent</h1>
        <p>Businesses you have marked as contacted.</p>
      </section>
      <SentList />
    </>
  );
}
