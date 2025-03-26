import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Product information";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image(props: {
  params: {
    product: string;
    subcategory: string;
    category: string;
  };
}) {
  const { product, subcategory, category } = props.params;
  const urlDecodedProduct = decodeURIComponent(product);
  const urlDecodedSubcategory = decodeURIComponent(subcategory);
  const urlDecodedCategory = decodeURIComponent(category);
  
  // Create a static description instead of fetching from the database
  const description = `Explore ${urlDecodedProduct} in our ${urlDecodedSubcategory} collection`;
  const placeholder = "/placeholder.svg";
  const price = "$99.99";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#fff",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "200px",
              height: "200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              style={{
                width: "300px",
                marginBottom: "30px",
              }}
              src={placeholder}
              alt={urlDecodedProduct}
            />
          </div>
        </div>
        <h1
          style={{
            fontSize: "64px",
            fontWeight: "bold",
            color: "#333",
            marginBottom: "20px",
          }}
        >
          {urlDecodedProduct}
        </h1>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            width: "100%",
          }}
        >
          <div
            style={{ textAlign: "center", display: "flex", fontSize: "24px" }}
          >
            {description}
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            display: "flex",
            fontSize: "24px",
            marginTop: "10px",
          }}
        >
          {price}
        </div>
        <div
          style={{
            marginTop: "40px",
            fontSize: "32px",
            color: "#666",
          }}
        >
          Category: {urlDecodedCategory} / {urlDecodedSubcategory}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
