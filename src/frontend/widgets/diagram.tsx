import { useEffect, useRef } from "react";

type Node = {
  id: string;
  label: string;
  fillStyle: string;
  x: number;
  y: number;
};

type Edge = {
  label: string;
  source: string;
  target: string;
};

export default function Diagram(props: {
  width: number;
  height: number;
  nodes: Node[];
  edges: Edge[];
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
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = node.fillStyle;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, node.x, node.y);
    });

    // Draw edges
    props.edges.forEach((edge) => {
      const { source, target, label } = edge;
      const node1 = props.nodes.find((n) => n.id === source)!;
      const node2 = props.nodes.find((n) => n.id === target)!;

      ctx.beginPath();
      ctx.moveTo(node1.x, node1.y);
      ctx.lineTo(node2.x, node2.y);
      ctx.stroke();

      const midX = (node1.x + node2.x) / 2;
      const midY = (node1.y + node2.y) / 2;
      ctx.fillText(label, midX, midY);
    });
  }, [props.nodes, props.edges]);

  return <canvas ref={canvas_ref} width={props.width} height={props.height} />;
}
