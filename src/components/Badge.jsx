import { OUTCOME_LABEL } from "../lib/data";

export default function Badge({ outcome }) {
  return (
    <span className={"badge " + outcome}>
      <span className="swatch"></span>
      {OUTCOME_LABEL[outcome]}
    </span>
  );
}
