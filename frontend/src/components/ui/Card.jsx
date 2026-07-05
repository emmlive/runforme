import "./ui.css";

const toneClass = {
  default: "",
  soft: "rf-card--soft",
  trust: "rf-card--trust",
};

export default function Card({
  children,
  tone = "default",
  elevated = false,
  interactive = false,
  className = "",
  as = "div",
  ...props
}) {
  const classes = [
    "rf-card",
    toneClass[tone] || "",
    elevated ? "rf-card--elevated" : "",
    interactive ? "rf-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const cardProps = {
    className: classes,
    ...props,
  };

  if (as === "section") {
    return <section {...cardProps}>{children}</section>;
  }

  if (as === "article") {
    return <article {...cardProps}>{children}</article>;
  }

  if (as === "button") {
    return <button type={props.type || "button"} {...cardProps}>{children}</button>;
  }

  return <div {...cardProps}>{children}</div>;
}
