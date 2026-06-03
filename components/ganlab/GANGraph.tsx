"use client"
import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export function GANGraph({ highlight }: { highlight?: string }) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    const w = 520, h = 260
    svg.attr('viewBox', `0 0 ${w} ${h}`)

    const nodes = [
      { id: 'noise', x: 60, y: 130, label: 'Noise' },
      { id: 'gen', x: 200, y: 80, label: 'Generator' },
      { id: 'samples', x: 340, y: 130, label: 'Samples' },
      { id: 'disc', x: 480, y: 80, label: 'Discriminator' }
    ]

    svg.selectAll('rect.node').data(nodes).enter().append('rect')
      .attr('class', 'node')
      .attr('x', d => d.x - 40)
      .attr('y', d => d.y - 30)
      .attr('width', 80)
      .attr('height', 60)
      .attr('rx', 6)
      .attr('fill', d => highlight === d.id ? '#fde68a' : '#f3f4f6')
      .attr('stroke', '#c4b5fd')

    svg.selectAll('text.lab').data(nodes).enter().append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .text(d => d.label)

    const links = [
      { source: 'noise', target: 'gen' },
      { source: 'gen', target: 'samples' },
      { source: 'samples', target: 'disc' }
    ]

    svg.selectAll('line.link').data(links).enter().append('line')
      .attr('x1', d => (nodes.find(n => n.id === d.source) as any).x)
      .attr('y1', d => (nodes.find(n => n.id === d.source) as any).y)
      .attr('x2', d => (nodes.find(n => n.id === d.target) as any).x)
      .attr('y2', d => (nodes.find(n => n.id === d.target) as any).y)
      .attr('stroke', '#9ca3af')
      .attr('stroke-dasharray', '4 4')
  }, [highlight])

  return <svg ref={ref} className="w-full h-64" />
}
