import QueueList from './queue-list';

export default function EmailQueuePage() {
  return (
    <>
      <section className="hero">
        <h1>Email Queue</h1>
        <p>Review outreach drafts before they are sent.</p>
      </section>
      <QueueList />
    </>
  );
}
