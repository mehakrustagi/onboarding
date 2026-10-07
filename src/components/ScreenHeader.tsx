/* Title and standfirst for a prototype route.
 *
 * It used to carry its own row of route pills, and the home page carried a
 * second grid of the same links that had already drifted out of step with
 * it. Both are gone: `SiteNav` in the root layout is the only navigation,
 * and it knows the current route from the pathname, so this no longer needs
 * an `active` prop to be kept in sync by hand.
 *
 * What is left is the thing the nav cannot say — what you are looking at and
 * what is worth watching for. Kept quiet and grey so it frames the phone
 * rather than competing with it. */

export default function ScreenHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 flex w-full max-w-[560px] flex-col gap-1.5 text-center">
      <h1 className="text-[22px] font-medium tracking-[-0.4px] text-[#0b0b0b]">
        {title}
      </h1>
      <p className="text-[14px] leading-[20px] text-[#6b6b73]">{description}</p>
    </header>
  );
}
