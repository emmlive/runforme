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
  as: Component = "div",
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

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}
