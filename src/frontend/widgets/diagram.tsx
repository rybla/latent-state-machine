import { useEffect, useRef } from "react";

type Node = [number, number, string];
type Edges = [number, number, string][];

export default function Diagram(props: {
  width: number;
  height: number;
  nodes: Node[];
  edges: Edges;
}) {
  const canvas_ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvas_ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw nodes
    props.nodes.forEach((node) => {
      const [x, y, label] = node;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fillStyle = "lightblue";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y);
    });

    // Draw edges
    props.edges.forEach((edge) => {
      const [n1, n2, label] = edge;
      const node1 = props.nodes[n1];
      const node2 = props.nodes[n2];

      ctx.beginPath();
      ctx.moveTo(node1[0], node1[1]);
      ctx.lineTo(node2[0], node2[1]);
      ctx.stroke();

      const midX = (node1[0] + node2[0]) / 2;
      const midY = (node1[1] + node2[1]) / 2;
      ctx.fillText(label, midX, midY);
    });
  }, [props.nodes, props.edges]);

  return <canvas ref={canvas_ref} width={props.width} height={props.height} />;
}
