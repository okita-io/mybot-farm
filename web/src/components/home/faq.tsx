import { Separator } from "@/components/ui/separator";
import { Container } from "@/components/container";
import { faqs } from "@/lib/site";

export function HomeFaq() {
  return (
    <section aria-labelledby="faq-heading" className="pb-20 sm:pb-28">
      <Container className="max-w-3xl">
        <h2
          id="faq-heading"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Questions
        </h2>
        <div className="mt-8">
          {faqs.map((faq, index) => (
            <article key={faq.question}>
              {index > 0 ? <Separator className="my-7" /> : null}
              <h3 className="text-lg font-medium tracking-tight text-foreground">
                {faq.question}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
