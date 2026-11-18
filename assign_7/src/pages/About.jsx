import PageHeading from "../components/PageHeading.jsx";
export default function About() {
  return (
    <>
      <PageHeading
        title="About TaskSpace"
        subtitle="A clear space for a clearer mind."
      />
      <section className="completion-panel welcome">
        <h2>One task at a time</h2>
        <p>
          TaskSpace helps you organize university work and personal goals, from
          To Do through In Progress to Completed.
        </p>
        <h2>Your workspace</h2>
        <p>
          Search, filter, sort, and share task views. Explore your progress on
          the dashboard and open any task for its details.
        </p>
        <h2>Where your data lives</h2>
        <p>
          Tasks and owner profiles load from{" "}
          <a href="https://dummyjson.com/" target="_blank" rel="noreferrer">
            DummyJSON
          </a>
          . This public demonstration API acknowledges writes without
          permanently storing them. TaskSpace keeps successful changes in this
          browser so your edits survive refreshes. Priority and category start
          as Medium and Personal until you change them; dates and descriptions
          are optional.
        </p>
        <p>
          Sign in to see your account profile. Task features are available to
          guests, and task changes stay in this browser.
        </p>
      </section>
    </>
  );
}
